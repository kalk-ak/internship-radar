/** Freshness drives colour across the UI: hot (< 1h), warm (< 24h), cool (older). */
export type Heat = "hot" | "warm" | "cool";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Calendar dates are always taken in Pacific time (like the internship list
 * itself), so the server and every visitor's browser agree on "Today".
 * Using the local timezone made server-rendered labels differ from the
 * browser's and broke hydration.
 */
export const TIME_ZONE = "America/Los_Angeles";

const keyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in Pacific time. */
export function pacificDay(ms: number) {
  return keyFormat.format(ms);
}

function dayNumber(ms: number) {
  const [y, m, d] = pacificDay(ms).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
}

export function heatOf(at: number, now = Date.now()): Heat {
  const age = now - at;
  if (age < HOUR) return "hot";
  if (age < DAY) return "warm";
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
  const d = Math.max(1, dayNumber(now) - dayNumber(at));
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TIME_ZONE });
}

export function dayLabel(at: number, now = Date.now()): string {
  const diff = dayNumber(now) - dayNumber(at);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: TIME_ZONE });
}

/** Compact form for log columns: now, 12m, 3h, 2d, then a date. */
export function timeAgoShort(at: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - at) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.max(1, dayNumber(now) - dayNumber(at));
  if (d < 7) return `${d}d`;
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TIME_ZONE }).toLowerCase();
}
