import { describe, expect, it } from "vitest";
import { buildAlert, filterForPrefs, sanitizePrefs } from "../src/lib/match";
import type { Role } from "../src/lib/types";

const role = (over: Partial<Role>): Role => ({
  id: Math.random().toString(36).slice(2),
  company: "Google",
  title: "Software Engineering Intern",
  url: "https://example.com/apply",
  locations: ["Mountain View, CA"],
  terms: ["Summer 2027"],
  category: "Software",
  sponsorship: "Other",
  postedAt: Date.now(),
  hot: true,
  swe: true,
  ...over,
});

describe("filterForPrefs", () => {
  const roles = [
    role({ company: "Google" }),
    role({ company: "Acme Widgets", hot: false }),
    role({ company: "Meta", category: "AI/ML/Data", title: "Research Scientist Intern", swe: false }),
    role({ company: "Tesla", category: "AI/ML/Data", title: "Software Engineer Intern, RL", swe: true }),
  ];

  it("defaults to hot software roles, including SWE titles in other categories", () => {
    const got = filterForPrefs(roles, sanitizePrefs(undefined)).map((r) => r.company);
    expect(got).toEqual(["Google", "Tesla"]);
  });

  it("includes watched companies even when hotOnly is on", () => {
    const got = filterForPrefs(roles, sanitizePrefs({ watch: ["Acme"] })).map((r) => r.company);
    expect(got).toContain("Acme Widgets");
  });

  it("returns every matching category when hotOnly is off", () => {
    const got = filterForPrefs(roles, sanitizePrefs({ categories: ["AI/ML/Data"], hotOnly: false }));
    expect(got.map((r) => r.company)).toEqual(["Meta", "Tesla"]);
  });
});

describe("buildAlert", () => {
  it("names a single company", () => {
    expect(buildAlert([role({})])?.headline).toBe("🔥 Google just opened a new SWE internship role");
  });

  it("summarises multiple companies", () => {
    const alert = buildAlert([role({}), role({}), role({ company: "Meta" }), role({ company: "Stripe" })]);
    expect(alert?.headline).toBe("🔥 Google, Meta and 1 more just opened 4 SWE internship roles");
    expect(alert?.companies).toEqual(["Google", "Meta", "Stripe"]);
  });

  it("returns null for no roles", () => {
    expect(buildAlert([])).toBeNull();
  });
});
