import { describe, expect, it } from "vitest";
import { dayLabel, pacificDay, timeAgo } from "../src/lib/heat";

// 23:59 and 00:01 Pacific on either side of midnight; both are Nov 9 in UTC.
const before = Date.UTC(2026, 10, 9, 7, 59);
const after = Date.UTC(2026, 10, 9, 8, 1);

describe("day labels use Pacific time on every machine", () => {
  it("splits days at Pacific midnight, not local midnight", () => {
    expect(pacificDay(before)).toBe("2026-11-08");
    expect(pacificDay(after)).toBe("2026-11-09");
    expect(dayLabel(before, after)).toBe("Yesterday");
    expect(dayLabel(after, after)).toBe("Today");
  });

  it("names older days consistently", () => {
    expect(dayLabel(Date.UTC(2026, 10, 6, 20), after)).toBe("Friday, Nov 6");
    expect(timeAgo(Date.UTC(2026, 10, 7, 12), after)).toBe("2 days ago");
  });
});
