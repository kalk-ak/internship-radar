import { describe, expect, it } from "vitest";
import { ACTIVITY_DAYS, buildActivity, busiestMonth, dayKey } from "../src/lib/activity";
import { makeCompanyMatcher } from "../src/lib/companies";
import type { RawListing } from "../src/lib/types";

const now = Date.UTC(2026, 10, 9, 20); // Nov 9 2026, noon Pacific
const listing = (id: string, company: string, daysAgo: number, over: Partial<RawListing> = {}): RawListing => ({
  id,
  company_name: company,
  title: "Software Engineer Intern",
  url: "https://example.com",
  category: "Software",
  date_posted: Math.floor((now - daysAgo * 86_400_000) / 1000),
  active: false, // closed roles still count as postings
  is_visible: true,
  ...over,
});

describe("buildActivity", () => {
  const isHot = makeCompanyMatcher(["google"]);
  const activity = buildActivity(
    [
      listing("1", "Google", 0),
      listing("2", "Acme", 0),
      listing("3", "Acme", 3),
      listing("4", "Acme", 3, { category: "Product", title: "PM Intern" }),
      listing("5", "Acme", 3, { is_visible: false }),
      listing("6", "Acme", 400),
    ],
    isHot,
    now,
  );

  it("covers a full year of days ending today", () => {
    expect(activity.days).toHaveLength(ACTIVITY_DAYS);
    expect(activity.days.at(-1)![0]).toBe(dayKey(now));
  });

  it("counts visible SWE postings and top-company postings per day", () => {
    expect(activity.days.at(-1)!.slice(1)).toEqual([2, 1]);
    expect(activity.days.at(-4)!.slice(1)).toEqual([1, 0]);
    expect(activity.days.reduce((a, [, n]) => a + n, 0)).toBe(3);
  });

  it("finds the busiest month", () => {
    expect(busiestMonth(activity)).toEqual({ month: "2026-11", count: 3 });
  });
});
