import { kv } from "./kv";

export const PROJECT_REPO = "kalk-ak/internship-radar";

export interface RepoStats {
  repo: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  license: string | null;
  topics: string[];
  pushedAt: string;
  languages: { name: string; percent: number }[];
  lastCommit: { sha: string; message: string; author: string; date: string } | null;
}

const FRESH_MS = 10 * 60 * 1000;

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "internship-radar",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Optional: a token with no scopes lifts the 60 requests/hour anonymous limit.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`GitHub ${path} ${res.status}`);
  return (await res.json()) as T;
}

async function fetchStats(repo: string, detailed: boolean): Promise<RepoStats> {
  const r = await gh<{
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    subscribers_count: number;
    open_issues_count: number;
    license: { spdx_id: string } | null;
    topics?: string[];
    pushed_at: string;
  }>(`/repos/${repo}`);

  let languages: RepoStats["languages"] = [];
  let lastCommit: RepoStats["lastCommit"] = null;
  if (detailed) {
    const [langs, commits] = await Promise.all([
      gh<Record<string, number>>(`/repos/${repo}/languages`).catch(() => ({})),
      gh<{ sha: string; commit: { message: string; author: { name: string; date: string } }; author: { login: string } | null }[]>(
        `/repos/${repo}/commits?per_page=1`,
      ).catch(() => []),
    ]);
    const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    languages = Object.entries(langs)
      .map(([name, bytes]) => ({ name, percent: Math.round((bytes / total) * 1000) / 10 }))
      .sort((a, b) => b.percent - a.percent);
    const c = commits[0];
    if (c) {
      lastCommit = {
        sha: c.sha,
        message: c.commit.message.split("\n")[0],
        author: c.author?.login ?? c.commit.author.name,
        date: c.commit.author.date,
      };
    }
  }

  return {
    repo,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.subscribers_count,
    openIssues: r.open_issues_count,
    license: r.license?.spdx_id ?? null,
    topics: r.topics ?? [],
    pushedAt: r.pushed_at,
    languages,
    lastCommit,
  };
}

/**
 * Repo stats cached in Redis for 10 minutes. On GitHub errors (including rate
 * limits) the last good value is served, however old.
 */
export async function repoStats(repo = PROJECT_REPO, detailed = true): Promise<RepoStats | null> {
  const key = `gh:repo:${repo}:${detailed ? "full" : "basic"}`;
  const cached = await kv().get<{ at: number; stats: RepoStats }>(key);
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.stats;
  try {
    const stats = await fetchStats(repo, detailed);
    await kv().set(key, { at: Date.now(), stats });
    return stats;
  } catch (err) {
    console.error("GitHub stats unavailable", err);
    return cached?.stats ?? null;
  }
}

export function compactNumber(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);
}
