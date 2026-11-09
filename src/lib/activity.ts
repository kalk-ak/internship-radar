import type { RawListing } from "./types";
import { pacificDay as dayKey } from "./heat";
import { toRole } from "./simplify";

/** Daily posting counts, bucketed in Pacific time like the SimplifyJobs README. */
export interface Activity {
  updatedAt: number;
  /** [YYYY-MM-DD, SWE postings, SWE postings at top companies], oldest first. */
  days: [string, number, number][];
}

export const ACTIVITY_DAYS = 53 * 7;

export { pacificDay as dayKey } from "./heat";

export function buildActivity(listings: RawListing[], isHot: (company: string) => boolean, now = Date.now()): Activity {
  const counts = new Map<string, [number, number]>();
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) counts.set(dayKey(now - i * 86_400_000), [0, 0]);
  for (const l of listings) {
    if (!l.is_visible || !l.id) continue;
    const role = toRole(l, isHot);
    if (!role.swe) continue;
    const bucket = counts.get(dayKey(role.postedAt));
    if (!bucket) continue;
    bucket[0] += 1;
    if (role.hot) bucket[1] += 1;
  }
  return { updatedAt: now, days: [...counts.entries()].map(([d, [n, h]]) => [d, n, h]) };
}

export function busiestMonth(activity: Activity) {
  const months = new Map<string, number>();
  for (const [d, n] of activity.days) months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) ?? 0) + n);
  let best: { month: string; count: number } | null = null;
  for (const [month, count] of months) if (!best || count > best.count) best = { month, count };
  return best;
}
