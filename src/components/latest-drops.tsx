import type { CSSProperties } from "react";
import { connection } from "next/server";
import { getFeed } from "@/lib/checker";
import { heatOf } from "@/lib/heat";
import type { Role } from "@/lib/types";
import { TimeAgo } from "./time-ago";

/** Size and width shrink with each step down the stack: newest drop is widest. */
const STEPS = [
  { size: 6.25, wdth: 150, wght: 850 },
  { size: 4.5, wdth: 128, wght: 800 },
  { size: 3.4, wdth: 108, wght: 760 },
  { size: 2.6, wdth: 92, wght: 720 },
  { size: 2.1, wdth: 80, wght: 680 },
  { size: 1.7, wdth: 72, wght: 650 },
];

const DOT = { hot: "bg-hot", warm: "bg-warm", cool: "bg-cool" } as const;

function byCompany(feed: Role[]) {
  const seen = new Map<string, { company: string; roles: Role[] }>();
  for (const r of feed) {
    if (!r.swe) continue;
    const entry = seen.get(r.company) ?? { company: r.company, roles: [] };
    entry.roles.push(r);
    seen.set(r.company, entry);
  }
  return [...seen.values()].slice(0, STEPS.length);
}

export async function LatestDrops() {
  await connection();
  const drops = byCompany(await getFeed(120));

  if (drops.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-rule-strong p-8 text-ink-soft">
        <p className="font-semibold text-ink">The first check hasn&apos;t run yet.</p>
        <p className="mt-1 text-sm">New drops from top companies will stack up here within a few minutes.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4" aria-label="Latest hot SWE internship drops, newest first">
      {drops.map((d, i) => {
        const step = STEPS[i];
        // Long names get scaled down so the widest step still fits the column.
        const fit = Math.min(1, 10 / Math.max(d.company.length, 1));
        const size = i < 2 ? step.size * Math.max(fit, 0.42) : step.size * Math.max(fit, 0.6);
        const newest = d.roles[0];
        return (
          <li key={d.company}>
            <a href={`/?q=${encodeURIComponent(d.company)}#board`} className="group block">
              <span
                className="block font-display leading-[0.92] tracking-tight text-ink transition-colors group-hover:text-hot-text"
                style={{ fontSize: `clamp(${Math.max(size * 0.6, 1.35).toFixed(2)}rem, ${(size * 1.55).toFixed(2)}vw, ${size.toFixed(2)}rem)`, fontVariationSettings: `"wdth" ${step.wdth}, "wght" ${step.wght}` }}
              >
                {d.company}
              </span>
              <span className="mt-1.5 flex items-center gap-2 text-sm text-ink-soft">
                <span className={`h-2 w-2 rounded-full ${DOT[heatOf(newest.postedAt)]}`} aria-hidden />
                <span>
                  {d.roles.length === 1 ? newest.title : `${d.roles.length} SWE roles`},{" "}
                  <TimeAgo at={newest.postedAt} className="font-semibold" />
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function LatestDropsSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      {STEPS.slice(0, 5).map((s, i) => (
        <div key={i} className="h-[var(--h)] rounded-md bg-wash" style={{ "--h": `${s.size * 0.7}rem`, width: `${90 - i * 14}%` } as CSSProperties} />
      ))}
    </div>
  );
}
