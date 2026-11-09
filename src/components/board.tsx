"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dayLabel } from "@/lib/heat";
import type { Role } from "@/lib/types";
import { CATEGORY_STYLE } from "@/lib/ui";
import { TimeAgo } from "./time-ago";

const TABS = [
  { value: "Software", label: "Software" },
  { value: "AI/ML/Data", label: "AI & ML" },
  { value: "Quant", label: "Quant" },
  { value: "Hardware", label: "Hardware" },
  { value: "Product", label: "Product" },
  { value: "all", label: "All roles" },
] as const;

type Tab = (typeof TABS)[number]["value"];
const PAGE = 40;

interface Props {
  initial: { roles: Role[]; total: number };
  initialQuery: { category: Tab; hotOnly: boolean; q: string };
}

function location(role: Role) {
  if (role.locations.length === 0) return "Location not listed";
  return role.locations.length > 1 ? `${role.locations[0]} + ${role.locations.length - 1} more` : role.locations[0];
}

function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warn" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        tone === "warn" ? "bg-bad-wash text-bad" : "bg-wash text-ink-soft"
      }`}
    >
      {children}
    </span>
  );
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

  // "/" focuses the search box: a shortcut for keyboard users, never required.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      e.preventDefault();
      search.current?.focus();
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
      <div className="flex flex-col gap-4 rounded-xl border border-rule bg-panel p-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Type of role" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={category === t.value}
              onClick={() => setCategory(t.value)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                category === t.value ? "bg-accent text-accent-ink" : "text-ink-soft hover:bg-wash hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex cursor-pointer items-center gap-2.5 px-1 text-sm text-ink-soft">
            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
              <input type="checkbox" className="peer sr-only" checked={hotOnly} onChange={(e) => setHotOnly(e.target.checked)} />
              <span className="absolute inset-0 rounded-full bg-rule-strong transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
              <span className="absolute left-0.5 h-4 w-4 rounded-full bg-ink transition-transform peer-checked:translate-x-4 peer-checked:bg-accent-ink" />
            </span>
            Top companies only
          </label>
          <input
            ref={search}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company or role"
            aria-label="Search roles"
            className="w-full rounded-lg border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink focus:border-accent focus:outline-none sm:w-64"
          />
        </div>
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {loading
          ? "Loading roles…"
          : data.total === 0
            ? "No roles found"
            : `Showing ${Math.min(data.roles.length, data.total).toLocaleString("en-US")} of ${data.total.toLocaleString("en-US")} ${data.total === 1 ? "role" : "roles"}`}
      </p>

      {groups.length === 0 && !loading ? (
        <div className="mt-6 rounded-xl border border-dashed border-rule-strong px-6 py-12 text-center">
          <p className="font-semibold text-ink">No roles match these filters.</p>
          <p className="mt-1 text-sm text-muted">Try turning off “Top companies only” or clearing the search.</p>
        </div>
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
          {groups.map((g) => (
            <section key={g.label} aria-label={`Posted ${g.label}`} className="mt-6">
              <h3 className="sticky top-[61px] z-10 bg-paper/90 py-2 text-sm font-semibold text-ink-soft backdrop-blur">{g.label}</h3>
              <ul className="overflow-hidden rounded-xl border border-rule bg-panel">
                {g.roles.map((r) => {
                  const cat = CATEGORY_STYLE[r.category];
                  return (
                    <li key={r.id} className="flex flex-col gap-3 border-t border-rule px-5 py-4 first:border-t-0 sm:flex-row sm:items-center sm:gap-6">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{r.company}</span>
                          {r.hot && !hotOnly && <span className="rounded-md bg-hot-wash px-2 py-0.5 text-xs font-medium text-hot-text">Top company</span>}
                        </p>
                        <p className="mt-0.5 text-ink-soft">{r.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Tag>{location(r)}</Tag>
                          {r.terms.map((t) => (
                            <Tag key={t}>{t}</Tag>
                          ))}
                          {category === "all" && (
                            <Tag>
                              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${cat.dot}`} aria-hidden />
                              {cat.label}
                            </Tag>
                          )}
                          {r.sponsorship === "Does Not Offer Sponsorship" && <Tag tone="warn">No visa sponsorship</Tag>}
                          {r.sponsorship === "U.S. Citizenship is Required" && <Tag tone="warn">US citizens only</Tag>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
                        <span className="text-sm text-muted">
                          Posted <TimeAgo at={r.postedAt} colored={false} />
                        </span>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
                        >
                          Apply<span className="sr-only"> to {r.title} at {r.company} (opens in a new tab)</span>
                        </a>
                      </div>
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
          className="mt-6 w-full rounded-lg border border-rule-strong bg-panel py-3 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink disabled:opacity-50"
        >
          {loading ? "Loading…" : `Show ${Math.min(PAGE, data.total - data.roles.length)} more roles`}
        </button>
      )}
    </div>
  );
}
