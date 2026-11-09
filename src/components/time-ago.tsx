"use client";

import { useEffect, useState } from "react";
import { heatOf, timeAgo } from "@/lib/heat";

const HEAT_CLASS = { hot: "text-hot-text", warm: "text-warm-text", cool: "text-muted" } as const;

export function TimeAgo({ at, colored = true, className = "" }: { at: number; colored?: boolean; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time
      dateTime={new Date(at).toISOString()}
      title={new Date(at).toLocaleString()}
      suppressHydrationWarning
      className={`${colored ? HEAT_CLASS[heatOf(at, now)] : ""} tabular-nums ${className}`}
    >
      {timeAgo(at, now)}
    </time>
  );
}
