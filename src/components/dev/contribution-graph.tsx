import type { Activity } from "@/lib/activity";
import { ScrollToEnd } from "./scroll-to-end";

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 18;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function levels(counts: number[]) {
  const nonZero = counts.filter((n) => n > 0).sort((a, b) => a - b);
  const q = (p: number) => nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return (n: number) => (n === 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);
}

function label(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** GitHub-style contribution graph of SWE internship postings per day. */
export function ContributionGraph({ activity }: { activity: Activity }) {
  const days = activity.days;
  const level = levels(days.map(([, n]) => n));
  const [fy, fm, fd] = days[0][0].split("-").map(Number);
  const offset = new Date(Date.UTC(fy, fm - 1, fd)).getUTCDay(); // 0 = Sunday
  const weeks = Math.ceil((days.length + offset) / 7);
  const width = LEFT + weeks * STEP;
  const height = TOP + 7 * STEP;

  const monthLabels: { x: number; text: string }[] = [];
  let lastMonth = -1;
  days.forEach(([date], i) => {
    const col = Math.floor((i + offset) / 7);
    const month = Number(date.slice(5, 7)) - 1;
    if (month !== lastMonth && Number(date.slice(8, 10)) <= 7) {
      if (!monthLabels.length || col * STEP - (monthLabels.at(-1)!.x - LEFT) > 2 * STEP) {
        monthLabels.push({ x: LEFT + col * STEP, text: MONTHS[month] });
      }
      lastMonth = month;
    }
  });

  return (
    <div>
      <ScrollToEnd className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="graph-title" className="block min-w-max">
          <title id="graph-title">Software engineering internship postings per day over the past year</title>
          {monthLabels.map((m) => (
            <text key={`${m.x}-${m.text}`} x={m.x} y={10} className="fill-muted font-data text-[10px]">
              {m.text}
            </text>
          ))}
          {[
            [1, "Mon"],
            [3, "Wed"],
            [5, "Fri"],
          ].map(([row, text]) => (
            <text key={text} x={0} y={TOP + (row as number) * STEP + 9} className="fill-muted font-data text-[10px]">
              {text}
            </text>
          ))}
          {days.map(([date, n, hot], i) => {
            const col = Math.floor((i + offset) / 7);
            const row = (i + offset) % 7;
            return (
              <rect
                key={date}
                x={LEFT + col * STEP}
                y={TOP + row * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                style={{ fill: `var(--heat-${level(n)})` }}
              >
                <title>
                  {n === 0
                    ? `No SWE internships posted on ${label(date)}`
                    : `${n} SWE internship${n === 1 ? "" : "s"} posted on ${label(date)}${hot ? ` (${hot} at top companies)` : ""}`}
                </title>
              </rect>
            );
          })}
        </svg>
      </ScrollToEnd>
      <div className="font-data mt-3 flex items-center justify-end gap-1 text-[0.7rem] text-muted" aria-hidden>
        <span className="mr-1">Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="inline-block h-[10px] w-[10px] rounded-[2px]" style={{ background: `var(--heat-${l})` }} />
        ))}
        <span className="ml-1">More</span>
      </div>
    </div>
  );
}
