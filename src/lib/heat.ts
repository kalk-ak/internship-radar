/** Freshness drives colour across the UI: hot (< 1h), warm (< 24h), cool (older). */
export type Heat = "hot" | "warm" | "cool";

const HOUR = 60 * 60 * 1000;

export function heatOf(at: number, now = Date.now()): Heat {
  const age = now - at;
  if (age < HOUR) return "hot";
  if (age < 24 * HOUR) return "warm";
  return "cool";
}

export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  // Past a day, count calendar days so it agrees with the day headings.
  const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const d = Math.max(1, Math.round((midnight(now) - midnight(at)) / (24 * HOUR)));
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dayLabel(at: number, now = Date.now()): string {
  const day = (t: number) => new Date(t).toDateString();
  if (day(at) === day(now)) return "Today";
  if (day(at) === day(now - 24 * HOUR)) return "Yesterday";
  return new Date(at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
