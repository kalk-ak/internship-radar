"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dayLabel } from "@/lib/heat";
import type { Role } from "@/lib/types";
import { TimeAgo } from "./time-ago";

const TABS = [
  { value: "Software", label: "Software" },
  { value: "AI/ML/Data", label: "AI, ML & data" },
  { value: "Quant", label: "Quant" },
  { value: "Hardware", label: "Hardware" },
  { value: "Product", label: "Product" },
  { value: "all", label: "Everything" },
] as const;

type Tab = (typeof TABS)[number]["value"];
const PAGE = 40;

interface Props {
  initial: { roles: Role[]; total: number };
  initialQuery: { category: Tab; hotOnly: boolean; q: string };
}

function location(role: Role) {
  if (role.locations.length === 0) return "Location not listed";
  return role.locations.length > 1 ? `${role.locations[0]} and ${role.locations.length - 1} more` : role.locations[0];
}

export function Board({ initial, initialQuery }: Props) {
  const [category, setCategory] = useState<Tab>(initialQuery.category);
  const [hotOnly, setHotOnly] = useState(initialQuery.hotOnly);
  const [q, setQ] = useState(initialQuery.q);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  async function load(offset: number) {
    setLoading(true);
    const params = new URLSearchParams({ category, hot: hotOnly ? "1" : "0", q, offset: String(offset), limit: String(PAGE) });
    try {
      const res = await fetch(`/api/roles?${params}`);
      const next = (await res.json()) as Props["initial"];
      setData((prev) => (offset === 0 ? next : { roles: [...prev.roles, ...next.roles], total: next.total }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => load(0), q ? 250 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, hotOnly, q]);

  const groups = useMemo(() => {
    const out: { label: string; roles: Role[] }[] = [];
    for (const role of data.roles) {
      const label = dayLabel(role.postedAt);
      if (out.at(-1)?.label === label) out.at(-1)!.roles.push(role);
      else out.push({ label, roles: [role] });
    }
    return out;
  }, [data.roles]);

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-rule pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Role type" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={category === t.value}
              onClick={() => setCategory(t.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                category === t.value ? "bg-ink text-paper" : "text-ink-soft hover:bg-wash"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-soft">
            <span className="relative inline-flex h-6 w-10 shrink-0 items-center">
              <input type="checkbox" className="peer sr-only" checked={hotOnly} onChange={(e) => setHotOnly(e.target.checked)} />
              <span className="absolute inset-0 rounded-full bg-rule-strong transition-colors peer-checked:bg-hot peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink" />
              <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
            </span>
            Top companies only
          </label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company or title"
            aria-label="Search roles"
            className="w-full rounded-lg border border-rule bg-panel px-3.5 py-2 text-sm placeholder:text-muted focus:border-ink focus:outline-none sm:w-64"
          />
        </div>
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {loading ? "Loading roles…" : `${data.total.toLocaleString()} ${data.total === 1 ? "role" : "roles"}`}
      </p>

      {groups.length === 0 && !loading ? (
        <div className="mt-6 rounded-xl border border-dashed border-rule-strong px-6 py-10 text-center">
          <p className="font-semibold">No roles match these filters.</p>
          <p className="mt-1 text-sm text-muted">Turn off “Top companies only” or clear the search to see more.</p>
        </div>
      ) : (
        <div className={`mt-2 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h3 className="sticky top-0 z-10 flex items-baseline justify-between bg-paper/95 py-3 text-sm font-bold text-ink backdrop-blur">
                {g.label}
                <span className="font-medium text-muted">
                  {g.roles.length} {g.roles.length === 1 ? "role" : "roles"}
                </span>
              </h3>
              <ul className="divide-y divide-rule border-y border-rule">
                {g.roles.map((r) => (
                  <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[13rem_1fr_6.5rem_auto]">
                    <div className="col-span-2 flex items-center gap-1.5 font-display text-[1.05rem] font-bold leading-tight [font-variation-settings:'wdth'_88] sm:col-span-1">
                      {r.hot && (
                        <span role="img" aria-label="Top company" className="text-sm">
                          🔥
                        </span>
                      )}
                      <span className="truncate">{r.company}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{r.title}</p>
                      <p className="text-sm text-muted">
                        {location(r)}
                        {r.terms.length ? `, ${r.terms.join(" / ")}` : ""}
                        {r.sponsorship === "Does Not Offer Sponsorship" ? ", no sponsorship" : ""}
                        {r.sponsorship === "U.S. Citizenship is Required" ? ", US citizens only" : ""}
                        <span className="sm:hidden">
                          , <TimeAgo at={r.postedAt} className="font-semibold" />
                        </span>
                      </p>
                    </div>
                    <TimeAgo at={r.postedAt} className="hidden text-sm font-semibold sm:block" />
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="row-span-1 rounded-lg border border-ink px-3.5 py-1.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
                    >
                      Apply<span className="sr-only"> to {r.title} at {r.company} (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {data.roles.length < data.total && (
        <button
          onClick={() => load(data.roles.length)}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-rule-strong bg-panel py-3 text-sm font-semibold transition-colors hover:border-ink disabled:opacity-50"
        >
          {loading ? "Loading…" : `Show ${Math.min(PAGE, data.total - data.roles.length)} more`}
        </button>
      )}
    </div>
  );
}
