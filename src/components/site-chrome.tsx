import { StarIcon } from "@primer/octicons-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { compactNumber, repoStats } from "@/lib/github";
import { DEV_PAGE_PATH } from "@/lib/seo";

export const REPO_URL = "https://github.com/kalk-ak/internship-radar";

export function RadarMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--color-rule-strong)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="var(--color-rule-strong)" strokeWidth="1.5" />
      <path d="M16 16 L27 8" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="var(--color-ink)" />
      <circle cx="22.5" cy="11" r="2.6" fill="var(--color-accent)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Internship Radar home">
      <RadarMark />
      <span className="whitespace-nowrap text-[1.05rem] font-semibold tracking-tight">Internship Radar</span>
    </Link>
  );
}

async function StarCount() {
  await connection();
  const stats = await repoStats();
  if (!stats) return null;
  return (
    <span className="rounded-md bg-wash px-1.5 text-xs tabular-nums text-ink-soft" aria-label={`${stats.stars} stars`}>
      {compactNumber(stats.stars)}
    </span>
  );
}

export function SiteHeader() {
  const link = "rounded-md px-3 py-2 font-medium text-ink-soft transition-colors hover:bg-wash hover:text-ink";
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/#board" className={`${link} hidden sm:block`}>
            Open roles
          </Link>
          <Link href={DEV_PAGE_PATH} className={`${link} hidden md:block`}>
            How it works
          </Link>
          <a href={REPO_URL} className={`${link} hidden items-center gap-2 sm:flex`}>
            <StarIcon size={14} />
            GitHub
            <Suspense>
              <StarCount />
            </Suspense>
          </a>
          <Link href="/#alerts" className="ml-1 whitespace-nowrap rounded-md bg-accent px-3.5 py-2 font-semibold text-accent-ink transition-colors hover:bg-accent-hover">
            Get alerts
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const link = "hover:text-ink";
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <RadarMark className="h-4 w-4" /> Internship Radar. Free and open source.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className={link} href={DEV_PAGE_PATH}>
            How it works
          </Link>
          <a className={link} href="/api/roles?limit=5">
            API
          </a>
          <a className={link} href={REPO_URL}>
            Source code
          </a>
        </nav>
      </div>
    </footer>
  );
}
