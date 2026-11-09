import Link from "next/link";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { getFeed, getState } from "@/lib/checker";
import type { Role } from "@/lib/types";
import { CATEGORY_STYLE } from "@/lib/ui";
import { TimeAgo } from "./time-ago";

const ROWS = 7;

function byCompany(feed: Role[]) {
  const seen = new Map<string, { company: string; roles: Role[] }>();
  for (const r of feed) {
    if (!r.swe) continue;
    const entry = seen.get(r.company) ?? { company: r.company, roles: [] };
    entry.roles.push(r);
    seen.set(r.company, entry);
  }
  return [...seen.values()].slice(0, ROWS);
}

function healthy(lastRunAt?: number) {
  return Boolean(lastRunAt && Date.now() - lastRunAt < 30 * 60 * 1000);
}

function Frame({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-panel shadow-[0_0_0_1px_rgb(255_181_71/0.04),0_30px_80px_-30px_rgb(255_181_71/0.18)]">
      <div className="font-data flex items-center justify-between border-b border-rule px-4 py-2.5 text-xs text-muted">
        <span>radar.log</span>
        <span className="flex items-center gap-2">
          <span className={`live-dot relative inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-ok text-ok" : "bg-cool text-cool"}`} aria-hidden />
          {live ? "live" : "idle"}
        </span>
      </div>
      <div className="font-data px-4 py-4 text-[0.8rem] leading-relaxed sm:px-5">{children}</div>
    </div>
  );
}

/** The hero: newest top-company SWE drops, rendered as a live log. */
export async function LatestDrops() {
  await connection();
  const [feed, state] = await Promise.all([getFeed(150), getState()]);
  const drops = byCompany(feed);
  const live = healthy(state.lastRunAt);

  return (
    <Frame live={live}>
      <p className="text-muted">
        <span className="text-accent">$</span> radar watch --top-companies --every 5m
      </p>
      {drops.length === 0 ? (
        <p className="mt-4 text-ink-soft">waiting for the first check…</p>
      ) : (
        <ol className="mt-4 space-y-3" aria-label="Latest top-company SWE internship drops, newest first">
          {drops.map(({ company, roles }) => {
            const newest = roles[0];
            const cat = CATEGORY_STYLE[newest.category];
            return (
              <li key={company}>
                <Link href={`/?q=${encodeURIComponent(company)}#board`} className="group grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 rounded-md -mx-2 px-2 py-1 hover:bg-wash">
                  <TimeAgo at={newest.postedAt} short className="pt-px text-right" />
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-semibold text-ink group-hover:text-accent">{company}</span>
                      <span className="shrink-0 text-accent">+{roles.length}</span>
                      <span className={`ml-auto shrink-0 ${cat.text}`}>{cat.short}</span>
                    </span>
                    <span className="block truncate text-muted">{roles.length === 1 ? newest.title : roles.map((r) => r.title).slice(0, 2).join(", ")}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-5 text-ink-soft">
        <span className="text-accent">›</span>{" "}
        {state.lastRunAt ? (
          <>
            checked <TimeAgo at={state.lastRunAt} colored={false} />, watching
          </>
        ) : (
          "starting up"
        )}{" "}
        <span className="cursor" aria-hidden />
      </p>
    </Frame>
  );
}

export function LatestDropsSkeleton() {
  return (
    <Frame live={false}>
      <div className="space-y-4" aria-hidden>
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-wash motion-reduce:animate-none" style={{ width: `${92 - i * 6}%` }} />
        ))}
      </div>
    </Frame>
  );
}
