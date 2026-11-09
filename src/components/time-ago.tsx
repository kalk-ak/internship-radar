"use client";

import { useEffect, useState } from "react";
import { heatOf, timeAgo, timeAgoShort } from "@/lib/heat";

const HEAT_CLASS = { hot: "text-hot-text", warm: "text-warm-text", cool: "text-muted" } as const;

export function TimeAgo({ at, colored = true, short = false, className = "" }: { at: number; colored?: boolean; short?: boolean; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time
      dateTime={new Date(at).toISOString()}
      title={new Date(at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" })}
      suppressHydrationWarning
      className={`${colored ? HEAT_CLASS[heatOf(at, now)] : ""} tabular-nums ${className}`}
    >
      {short ? timeAgoShort(at, now) : timeAgo(at, now)}
    </time>
  );
}
