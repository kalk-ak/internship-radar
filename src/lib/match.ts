import { makeCompanyMatcher } from "./companies";
import type { Alert, Prefs, Role } from "./types";

export const DEFAULT_PREFS: Prefs = { categories: ["Software"], hotOnly: true, watch: [] };

export function roleMatches(role: Role, prefs: Prefs, watching: (company: string) => boolean): boolean {
  const wantsCategory =
    prefs.categories.includes(role.category) || (prefs.categories.includes("Software") && role.swe);
  if (!wantsCategory) return false;
  return !prefs.hotOnly || role.hot || watching(role.company);
}

export function filterForPrefs(roles: Role[], prefs: Prefs): Role[] {
  const watching = makeCompanyMatcher(prefs.watch);
  return roles.filter((r) => roleMatches(r, prefs, watching));
}

export function groupByCompany(roles: Role[]): Map<string, Role[]> {
  const groups = new Map<string, Role[]>();
  for (const role of roles) {
    const list = groups.get(role.company) ?? [];
    list.push(role);
    groups.set(role.company, list);
  }
  // Hot companies first, then by number of roles.
  return new Map(
    [...groups.entries()].sort(
      ([, a], [, b]) => Number(b[0].hot) - Number(a[0].hot) || b.length - a.length,
    ),
  );
}

function roleNoun(roles: Role[]) {
  const n = roles.length;
  const kind = roles.every((r) => r.swe) ? "SWE internship" : "internship";
  return n === 1 ? `a new ${kind} role` : `${n} ${kind} roles`;
}

export function buildAlert(roles: Role[]): Alert | null {
  if (roles.length === 0) return null;
  const groups = groupByCompany(roles);
  const companies = [...groups.keys()];
  const fire = roles.some((r) => r.hot) ? "🔥 " : "";
  let headline: string;
  if (companies.length === 1) {
    headline = `${fire}${companies[0]} just opened ${roleNoun(roles)}`;
  } else if (companies.length === 2) {
    headline = `${fire}${companies[0]} and ${companies[1]} just opened ${roleNoun(roles)}`;
  } else {
    headline = `${fire}${companies[0]}, ${companies[1]} and ${companies.length - 2} more just opened ${roleNoun(roles)}`;
  }
  return { headline, companies, roles: [...groups.values()].flat() };
}

export function sanitizePrefs(input: Partial<Prefs> | undefined): Prefs {
  const allowed = new Set(["Software", "AI/ML/Data", "Quant", "Hardware", "Product"]);
  const categories = (input?.categories ?? DEFAULT_PREFS.categories).filter((c) => allowed.has(c));
  const watch = (input?.watch ?? [])
    .map((w) => String(w).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 50);
  return {
    categories: categories.length ? categories : DEFAULT_PREFS.categories,
    hotOnly: input?.hotOnly ?? DEFAULT_PREFS.hotOnly,
    watch: [...new Set(watch)],
  };
}
