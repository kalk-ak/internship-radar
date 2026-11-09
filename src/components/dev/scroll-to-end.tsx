"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A horizontal scroller that starts at the end, so narrow screens show the most recent data first. */
export function ScrollToEnd({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
