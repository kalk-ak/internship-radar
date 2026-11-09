import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { getFeed, getState } from "@/lib/checker";
import type { Role } from "@/lib/types";
import { CATEGORY_STYLE } from "@/lib/ui";
import { TimeAgo } from "./time-ago";

const ROWS = 5;

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

function Frame({ live, footer, children }: { live: boolean; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-panel">
      <div className="flex items-center justify-between border-b border-rule px-5 py-4">
        <h2 className="font-semibold text-ink">Latest openings at top companies</h2>
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className={`live-dot relative inline-block h-2 w-2 rounded-full ${live ? "bg-ok text-ok" : "bg-cool text-cool"}`} aria-hidden />
          {live ? "Live" : "Paused"}
        </span>
      </div>
      {children}
      {footer && <p className="border-t border-rule px-5 py-3 text-sm text-muted">{footer}</p>}
    </div>
  );
}

/** Hero card: the newest software roles at top companies, one row per company. */
export async function LatestDrops() {
  await connection();
  const [feed, state] = await Promise.all([getFeed(150), getState()]);
  const drops = byCompany(feed);
  const live = healthy(state.lastRunAt);
  const footer = state.lastRunAt ? (
    <>
      Last checked <TimeAgo at={state.lastRunAt} colored={false} />. We check every 5 minutes.
    </>
  ) : (
    "We check every 5 minutes."
  );

  return (
    <Frame live={live} footer={footer}>
      {drops.length === 0 ? (
        <p className="px-5 py-8 text-ink-soft">New roles will show up here after the first check.</p>
      ) : (
        <ul>
          {drops.map(({ company, roles }) => {
            const newest = roles[0];
            const cat = CATEGORY_STYLE[newest.category];
            return (
              <li key={company} className="border-t border-rule first:border-t-0">
                <Link href={`/?q=${encodeURIComponent(company)}#board`} className="block px-5 py-4 transition-colors hover:bg-wash">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold text-ink">{company}</span>
                    <span className="shrink-0 text-sm font-medium text-accent">
                      {roles.length === 1 ? "1 new role" : `${roles.length} new roles`}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-soft">{newest.title}</span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${cat.dot}`} aria-hidden />
                    {cat.label}
                    <span aria-hidden>·</span>
                    <TimeAgo at={newest.postedAt} colored={false} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Frame>
  );
}

export function LatestDropsSkeleton() {
  return (
    <Frame live={false}>
      <div className="space-y-5 px-5 py-5" aria-hidden>
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-wash motion-reduce:animate-none" />
        ))}
      </div>
    </Frame>
  );
}
