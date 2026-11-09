import { buildActivity, type Activity } from "./activity";
import { HOT_FEED_LIMIT, NEW_LISTING_WINDOW_MS, RUN_LOG_LIMIT, SEEN_RETENTION_MS } from "./env";
import { kv } from "./kv";
import { maybeRefreshInstagramToken, notifySubscribers } from "./notify";
import { getSettings } from "./settings";
import { checkReadme, detectRepo, fetchListings, hotMatcher, openRoles } from "./simplify";
import type { BoardSnapshot, CheckState, Role, RunLog } from "./types";

export const KEYS = {
  lock: "lock:check",
  state: "state:check",
  seen: "seen",
  feed: "feed:hot",
  board: "board:snapshot",
  runs: "log:runs",
  activity: "stats:activity",
};

const REPO_RECHECK_MS = 12 * 60 * 60 * 1000;
const SCHEDULED = ["qstash", "github-actions", "vercel-schedule"];
export const BOARD_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;
const BOARD_LIMIT = 1000;

export async function getState(): Promise<CheckState> {
  return (await kv().get<CheckState>(KEYS.state)) ?? {};
}

export async function getBoard() {
  return kv().get<BoardSnapshot>(KEYS.board);
}

export async function getFeed(limit = 60) {
  return kv().lrange<Role>(KEYS.feed, 0, limit - 1);
}

export async function getActivity() {
  return kv().get<Activity>(KEYS.activity);
}

export async function getRuns(limit = 50) {
  return kv().lrange<RunLog>(KEYS.runs, 0, limit - 1);
}

function buildBoard(repo: string, roles: Role[], now: number): BoardSnapshot {
  const byCategory: Record<string, number> = {};
  for (const r of roles) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  const hot = roles.filter((r) => r.hot);
  // Keep the snapshot small: recent SWE roles plus recent hot roles in other categories.
  const shown = roles
    .filter((r) => (r.swe || r.hot) && r.postedAt >= now - BOARD_WINDOW_MS)
    .sort((a, b) => b.postedAt - a.postedAt)
    .slice(0, BOARD_LIMIT)
    .map((r) => ({ ...r, locations: r.locations.slice(0, 3) }));
  return {
    repo,
    updatedAt: now,
    totals: {
      active: roles.length,
      byCategory,
      hot: hot.length,
      hotCompanies: new Set(hot.map((r) => r.company)).size,
    },
    roles: shown,
  };
}

/**
 * One polling cycle. Safe to call concurrently (a Redis lock serialises runs)
 * and repeatedly (listings already in the seen-set never alert twice).
 */
export async function runCheck(trigger: string, opts: { force?: boolean } = {}): Promise<RunLog> {
  const started = Date.now();
  const log: RunLog = { at: started, trigger, changed: false, newRoles: 0, newHot: 0, alerts: 0, failures: 0, durationMs: 0 };

  if (!(await kv().set(KEYS.lock, started, { ex: 240, nx: true }))) {
    return { ...log, skipped: "Another check is already running" };
  }

  const state = await getState();
  try {
    let repo = state.repo;
    if (!repo || !state.repoCheckedAt || started - state.repoCheckedAt > REPO_RECHECK_MS) {
      repo = await detectRepo();
      state.repoCheckedAt = started;
      if (state.repo && state.repo !== repo) {
        // New recruiting season: re-baseline silently instead of alerting on the whole new list.
        Object.assign(state, { baselineDone: false, listingsEtag: undefined, readmeEtag: undefined });
      }
      state.repo = repo;
    }
    log.repo = repo;

    // 1. Has the README markdown changed? (304 Not Modified when it hasn't.)
    const readme = await checkReadme(repo, state.readmeEtag);
    if (readme.changed) {
      state.readmeEtag = readme.etag;
      state.lastReadmeChangeAt = started;
    }

    // 2. Pull the structured listings behind the README (also conditional).
    const listings = await fetchListings(repo, opts.force ? undefined : state.listingsEtag);
    const settings = await getSettings();
    await maybeRefreshInstagramToken(settings);

    if (listings.changed) {
      log.changed = true;
      const isHot = hotMatcher(settings.extraHotCompanies);
      const roles = openRoles(listings.body, isHot);
      await kv().set(KEYS.board, buildBoard(repo, roles, started));
      await kv().set(KEYS.activity, buildActivity(listings.body, isHot, started));

      const candidates = roles.filter((r) => r.postedAt >= started - NEW_LISTING_WINDOW_MS);
      let fresh: Role[] = [];

      if (!state.baselineDone) {
        // First run: remember everything that's already listed, alert on nothing.
        await kv().zadd(KEYS.seen, candidates.map((r) => ({ score: r.postedAt, member: r.id })));
        const seed = roles
          .filter((r) => r.hot)
          .sort((a, b) => b.postedAt - a.postedAt)
          .slice(0, 60)
          .reverse();
        await kv().del(KEYS.feed);
        await kv().lpush(KEYS.feed, seed, HOT_FEED_LIMIT);
        state.baselineDone = true;
        log.baseline = true;
      } else {
        const scores = await kv().zmscore(KEYS.seen, candidates.map((r) => r.id));
        fresh = candidates.filter((_, i) => scores[i] === null).sort((a, b) => a.postedAt - b.postedAt);
        if (fresh.length) await kv().zadd(KEYS.seen, fresh.map((r) => ({ score: r.postedAt, member: r.id })));
        await kv().zremRangeByScore(KEYS.seen, 0, started - SEEN_RETENTION_MS);
      }

      const freshHot = fresh.filter((r) => r.hot);
      if (freshHot.length) await kv().lpush(KEYS.feed, freshHot, HOT_FEED_LIMIT);
      log.newRoles = fresh.length;
      log.newHot = freshHot.length;

      if (fresh.length) {
        const result = await notifySubscribers(fresh, settings);
        log.alerts = result.alerted;
        log.failures = result.failures;
      }

      state.listingsEtag = listings.etag;
      state.lastChangeAt = started;
    }

    state.lastError = undefined;
  } catch (err) {
    log.error = err instanceof Error ? err.message : String(err);
    state.lastError = log.error;
    state.lastErrorAt = started;
    console.error("Check failed", err);
  } finally {
    state.lastRunAt = started;
    state.runs = (state.runs ?? 0) + 1;
    log.durationMs = Date.now() - started;
    await kv().set(KEYS.state, state);
    // Quiet runs are only logged occasionally to keep the history readable.
    if (log.changed || log.error || (state.runs ?? 0) % 12 === 0 || !SCHEDULED.includes(trigger)) {
      await kv().lpush(KEYS.runs, [log], RUN_LOG_LIMIT);
    }
    await kv().del(KEYS.lock);
  }
  return log;
}
