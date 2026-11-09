import Link from "next/link";

export const REPO_URL = "https://github.com/kalk-ak/internship-radar";

export function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Internship Radar home">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="var(--color-rule-strong)" strokeWidth="1.5" />
        <path d="M16 16 L27 8" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="22.5" cy="11" r="2.6" fill="var(--color-hot)" />
      </svg>
      <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight [font-variation-settings:'wdth'_120]">Internship Radar</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <Wordmark />
      <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
        <a href="#board" className="hidden rounded-lg px-3 py-2 text-ink-soft hover:bg-wash sm:block">
          Open roles
        </a>
        <a href={REPO_URL} className="hidden rounded-lg px-3 py-2 text-ink-soft hover:bg-wash sm:block">
          GitHub
        </a>
        <a href="#alerts" className="whitespace-nowrap rounded-lg bg-ink px-3.5 py-2 text-paper hover:opacity-90">
          Get alerts
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Listings come from the{" "}
          <a className="font-medium text-ink-soft underline underline-offset-2" href="https://github.com/SimplifyJobs">
            SimplifyJobs
          </a>{" "}
          internship list, maintained by Simplify and Pitt CSC. Not affiliated with either.
        </p>
        <p>
          <a className="font-medium text-ink-soft underline underline-offset-2" href={REPO_URL}>
            Open source
          </a>{" "}
          under the MIT license.
        </p>
      </div>
    </footer>
  );
}
