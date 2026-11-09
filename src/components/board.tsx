"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dayLabel } from "@/lib/heat";
import type { Role } from "@/lib/types";
import { CATEGORY_STYLE } from "@/lib/ui";
import { TimeAgo } from "./time-ago";

const TABS = [
  { value: "Software", label: "software", dot: CATEGORY_STYLE.Software.dot },
  { value: "AI/ML/Data", label: "ai / ml", dot: CATEGORY_STYLE["AI/ML/Data"].dot },
  { value: "Quant", label: "quant", dot: CATEGORY_STYLE.Quant.dot },
  { value: "Hardware", label: "hardware", dot: CATEGORY_STYLE.Hardware.dot },
  { value: "Product", label: "product", dot: CATEGORY_STYLE.Product.dot },
  { value: "all", label: "all", dot: "bg-ink-soft" },
] as const;

type Tab = (typeof TABS)[number]["value"];
const PAGE = 40;

interface Props {
  initial: { roles: Role[]; total: number };
  initialQuery: { category: Tab; hotOnly: boolean; q: string };
}

function location(role: Role) {
  if (role.locations.length === 0) return "location not listed";
  return role.locations.length > 1 ? `${role.locations[0]} +${role.locations.length - 1}` : role.locations[0];
}

function notes(role: Role) {
  return [
    role.terms.join(" / "),
    role.sponsorship === "Does Not Offer Sponsorship" ? "no sponsorship" : "",
    role.sponsorship === "U.S. Citizenship is Required" ? "US citizens only" : "",
  ].filter(Boolean);
}

export function Board({ initial, initialQuery }: Props) {
  const [category, setCategory] = useState<Tab>(initialQuery.category);
  const [hotOnly, setHotOnly] = useState(initialQuery.hotOnly);
  const [q, setQ] = useState(initialQuery.q);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);
  const search = useRef<HTMLInputElement>(null);

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

  // "/" focuses search, like most developer tools.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      e.preventDefault();
      search.current?.focus();
      search.current?.scrollIntoView({ block: "center" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Role type" className="font-data -mx-4 flex gap-1 overflow-x-auto px-4 text-[0.8rem] lg:mx-0 lg:px-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={category === t.value}
              onClick={() => setCategory(t.value)}
              className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 transition-colors ${
                category === t.value ? "border-rule-strong bg-wash text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="font-data flex cursor-pointer items-center gap-2.5 text-[0.8rem] text-ink-soft">
            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
              <input type="checkbox" className="peer sr-only" checked={hotOnly} onChange={(e) => setHotOnly(e.target.checked)} />
              <span className="absolute inset-0 rounded-full bg-rule-strong transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
              <span className="absolute left-0.5 h-4 w-4 rounded-full bg-ink transition-transform peer-checked:translate-x-4 peer-checked:bg-accent-ink" />
            </span>
            top companies only
          </label>
          <div className="relative">
            <input
              ref={search}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search company or title"
              aria-label="Search roles"
              className="font-data w-full rounded-md border border-rule-strong bg-panel py-2 pl-3 pr-9 text-[0.8rem] text-ink focus:border-accent focus:outline-none sm:w-64"
            />
            {!q && (
              <kbd className="font-data pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-rule-strong px-1.5 text-[0.7rem] text-muted">
                /
              </kbd>
            )}
          </div>
        </div>
      </div>

      <p className="font-data mt-5 text-[0.78rem] text-muted" aria-live="polite">
        {loading ? "loading…" : `${data.total.toLocaleString("en-US")} ${data.total === 1 ? "role" : "roles"}`}
      </p>

      {groups.length === 0 && !loading ? (
        <div className="mt-6 rounded-xl border border-dashed border-rule-strong px-6 py-12 text-center">
          <p className="font-semibold text-ink">No roles match these filters.</p>
          <p className="mt-1 text-sm text-muted">Turn off “top companies only” or clear the search to see more.</p>
        </div>
      ) : (
        <div className={`mt-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label} className="mt-6 first:mt-2">
              <h3 className="font-data sticky top-[57px] z-10 flex items-baseline justify-between bg-paper/90 py-2 text-[0.75rem] text-muted backdrop-blur">
                <span>
                  <span className="text-accent">{"//"}</span> {g.label.toLowerCase()}
                </span>
                <span>
                  {g.roles.length} {g.roles.length === 1 ? "role" : "roles"}
                </span>
              </h3>
              <ul className="overflow-hidden rounded-xl border border-rule bg-panel">
                {g.roles.map((r) => {
                  const cat = CATEGORY_STYLE[r.category];
                  return (
                    <li
                      key={r.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-rule px-4 py-3.5 first:border-t-0 transition-colors hover:bg-wash sm:grid-cols-[3.5rem_12rem_minmax(0,1fr)_auto]"
                    >
                      <TimeAgo at={r.postedAt} short className="font-data hidden text-[0.78rem] sm:block" />
                      <div className="font-data col-span-2 flex min-w-0 items-center gap-2 text-[0.85rem] font-semibold text-ink sm:col-span-1">
                        <span className="truncate">{r.company}</span>
                        {r.hot && (
                          <span className="shrink-0 rounded bg-hot-wash px-1.5 text-[0.65rem] font-medium text-hot-text" title="Top company">
                            top
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium leading-snug text-ink">{r.title}</p>
                        <p className="font-data mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.72rem] text-muted">
                          <span className={`inline-flex items-center gap-1.5 ${cat.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cat.dot}`} aria-hidden />
                            {cat.short}
                          </span>
                          {[location(r), ...notes(r).map((n) => n.toLowerCase())].map((part) => (
                            <span key={part} className="before:mr-2 before:text-rule-strong before:content-['/']">
                              {part}
                            </span>
                          ))}
                          <TimeAgo at={r.postedAt} short className="sm:hidden" />
                        </p>
                      </div>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-rule-strong px-3 py-1.5 text-center text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
                      >
                        Apply<span className="sr-only"> to {r.title} at {r.company} (opens in a new tab)</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {data.roles.length < data.total && (
        <button
          onClick={() => load(data.roles.length)}
          disabled={loading}
          className="font-data mt-6 w-full rounded-lg border border-rule-strong bg-panel py-3 text-[0.8rem] text-ink-soft transition-colors hover:border-ink-soft hover:text-ink disabled:opacity-50"
        >
          {loading ? "loading…" : `load ${Math.min(PAGE, data.total - data.roles.length)} more`}
        </button>
      )}
    </div>
  );
}
