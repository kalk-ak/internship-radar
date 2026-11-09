import {
  BookIcon,
  CheckCircleFillIcon,
  CodeIcon,
  EyeIcon,
  FileDirectoryFillIcon,
  FileIcon,
  GitCommitIcon,
  HistoryIcon,
  LawIcon,
  LinkIcon,
  PulseIcon,
  QuestionIcon,
  RepoForkedIcon,
    RocketIcon,
  ServerIcon,
  StarIcon,
  WorkflowIcon,
} from "@primer/octicons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CodeBlock } from "@/components/dev/copy-button";
import { ContributionGraph } from "@/components/dev/contribution-graph";
import { ThemeToggle, themeBootScript } from "@/components/dev/theme-toggle";
import { TimeAgo } from "@/components/time-ago";
import { appUrl } from "@/lib/env";
import { compactNumber, PROJECT_REPO, type RepoStats } from "@/lib/github";
import {
  buildFaq,
  DEV_PAGE_DESCRIPTION,
  DEV_PAGE_PATH,
  DEV_PAGE_TITLE,
  formatDate,
  isOperational,
  jsonLd,
  loadDevPageData,
  REPO_HTML_URL,
  topHiringCompanies,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: DEV_PAGE_TITLE,
  description: DEV_PAGE_DESCRIPTION,
  keywords: [
    "SWE internship alerts",
    "software engineering internships",
    "Summer 2027 internships",
    "FAANG internship notifications",
    "internship tracker",
    "Telegram internship bot",
    "Discord internship alerts",
    "open source",
  ],
  alternates: { canonical: DEV_PAGE_PATH },
  // Setting openGraph here replaces the inherited object, so the image is listed explicitly.
  openGraph: {
    type: "website",
    url: DEV_PAGE_PATH,
    title: `${DEV_PAGE_TITLE} | Internship Radar`,
    description: DEV_PAGE_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: DEV_PAGE_TITLE }],
  },
  twitter: { card: "summary_large_image", title: DEV_PAGE_TITLE, description: DEV_PAGE_DESCRIPTION, images: ["/opengraph-image"] },
};

const TABS = [
  { href: "#readme", label: "README", icon: BookIcon },
  { href: "#how-it-works", label: "How it works", icon: WorkflowIcon },
  { href: "#api", label: "API", icon: CodeIcon },
  { href: "#faq", label: "FAQ", icon: QuestionIcon },
  { href: "#self-host", label: "Self-host", icon: ServerIcon },
];

const FILES: { path: string; dir?: boolean; note: string }[] = [
  { path: ".github/workflows", dir: true, note: "5-minute trigger and CI" },
  { path: "src/app", dir: true, note: "Pages, admin dashboard and API routes" },
  { path: "src/lib", dir: true, note: "Checker, matching and channel senders" },
  { path: "tests", dir: true, note: "Vitest suites, no network needed" },
  { path: "LICENSE", note: "MIT" },
  { path: "README.md", note: "Setup and self-hosting guide" },
  { path: "vercel.json", note: "15-minute backup schedule" },
];

/** Topic chips, minus the data-source tag. */
function topics(repo: RepoStats | null) {
  return (repo?.topics ?? []).filter((t) => !t.includes("simplify"));
}

const LANGUAGE_COLORS: Record<string, string> = { TypeScript: "#3178c6", CSS: "#663399", JavaScript: "#f1e05a" };

const DIAGRAM = `GitHub Actions             Vercel function                internship list
*/5 * * * *  ──POST──▶  /api/check  ──If-None-Match──▶  README.md
                             │                            listings.json
                             │◀─── 304 Not Modified ──────┘   done in ~50 ms
                             │◀─── 200 + new listings
                             ▼
                   diff against Redis seen-set
                   match each subscriber's prefs
                             ▼
       email   telegram   discord   whatsapp   instagram`;

const SELF_HOST = `git clone ${REPO_HTML_URL}.git
cd internship-radar
npm install
npm run dev                              # http://localhost:3000
curl -X POST localhost:3000/api/check    # run a check locally`;

/* ------------------------------------------------------------ primitives */

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="inline-flex overflow-hidden rounded-[3px] font-[Verdana,'DejaVu_Sans',sans-serif] text-[11px] leading-5 text-white">
      <span className="bg-[#555] px-1.5">{label}</span>
      <span className="px-1.5" style={{ background: color }}>
        {value}
      </span>
    </span>
  );
}

function Heading({ id, level = 2, children }: { id: string; level?: 2 | 3; children: ReactNode }) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className="scroll-mt-20">
      <a href={`#${id}`} className="anchor" aria-hidden tabIndex={-1}>
        #
      </a>
      {children}
    </Tag>
  );
}

function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-gh-border ${className}`}>{children}</div>;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-gh-subtle motion-reduce:animate-none ${className}`} />;
}

/* ------------------------------------------------------------ live parts */

async function RepoButtons() {
  const { repo } = await loadDevPageData();
  const btn = "h-8 items-center gap-2 rounded-md border border-gh-border bg-gh-btn px-3 text-xs font-medium text-gh-fg hover:bg-gh-btn-hover";
  const count = "rounded-full bg-[color-mix(in_srgb,var(--gh-muted)_20%,transparent)] px-1.5 text-[11px] font-semibold";
  return (
    <>
      <a href={`${REPO_HTML_URL}/fork`} className={`${btn} hidden sm:inline-flex`}>
        <RepoForkedIcon size={16} className="text-gh-muted" /> Fork <span className={count}>{compactNumber(repo?.forks ?? 0)}</span>
      </a>
      <a href={REPO_HTML_URL} className={`${btn} inline-flex`} aria-label={`Star ${PROJECT_REPO} on GitHub, ${repo?.stars ?? 0} stars`}>
        <StarIcon size={16} className="text-gh-muted" /> Star <span className={count}>{compactNumber(repo?.stars ?? 0)}</span>
      </a>
    </>
  );
}

async function LatestCommit() {
  const { repo } = await loadDevPageData();
  const c = repo?.lastCommit;
  return (
    <div className="flex items-center gap-3 rounded-t-md border-b border-gh-border bg-gh-subtle px-4 py-3 text-sm">
      {c ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://github.com/${c.author}.png?size=40`} alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded-full" />
          <a href={`https://github.com/${c.author}`} className="shrink-0 font-semibold hover:text-gh-accent hover:underline">
            {c.author}
          </a>
          <a href={`${REPO_HTML_URL}/commit/${c.sha}`} className="min-w-0 truncate text-gh-muted hover:text-gh-accent hover:underline">
            {c.message}
          </a>
          <span className="ml-auto hidden shrink-0 items-center gap-2 font-gh-mono text-xs text-gh-muted sm:flex">
            {c.sha.slice(0, 7)} <span aria-hidden>·</span> <TimeAgo at={Date.parse(c.date)} colored={false} />
          </span>
          <a href={`${REPO_HTML_URL}/commits/main`} className="flex shrink-0 items-center gap-1 font-semibold hover:text-gh-accent">
            <HistoryIcon size={16} /> <span className="hidden sm:inline">History</span>
          </a>
        </>
      ) : (
        <span className="text-gh-muted">
          <GitCommitIcon size={16} /> Commit history is on GitHub.
        </span>
      )}
    </div>
  );
}

async function ActivityCard() {
  const { activity } = await loadDevPageData();
  if (!activity) {
    return (
      <Box className="p-4 text-sm text-gh-muted">
        <PulseIcon size={16} /> Posting activity appears after the next listings update.
      </Box>
    );
  }
  const total = activity.days.reduce((a, [, n]) => a + n, 0);
  const hot = activity.days.reduce((a, [, , h]) => a + h, 0);
  return (
    <section aria-labelledby="activity-title">
      <h2 id="activity-title" className="mb-2 text-base font-normal">
        {total.toLocaleString()} SWE internships posted in the last year
        <span className="text-gh-muted">, {hot.toLocaleString()} at top companies</span>
      </h2>
      <Box className="p-4">
        <ContributionGraph activity={activity} />
        <p className="mt-3 text-xs text-gh-muted">
          Each square is one day of new software engineering internship postings, in Pacific time. Hover
          for counts.
        </p>
      </Box>
    </section>
  );
}

async function LiveSummary() {
  const { board, state } = await loadDevPageData();
  if (!board) return null;
  return (
    <blockquote>
      <p>
        Right now the list has <strong>{(board.totals.byCategory.Software ?? 0).toLocaleString()}</strong> open software
        engineering internships, and <strong>{board.totals.hot.toLocaleString()}</strong> open roles across{" "}
        <strong>{board.totals.hotCompanies}</strong> top companies.
        {state.lastRunAt && (
          <>
            {" "}
            Last checked <TimeAgo at={state.lastRunAt} colored={false} />.
          </>
        )}
      </p>
    </blockquote>
  );
}

async function LiveBadges() {
  const { repo, state } = await loadDevPageData();
  const ok = isOperational(state);
  return (
    <p className="flex flex-wrap gap-1.5">
      <Badge label="license" value="MIT" color="#007ec6" />
      <Badge label="checks" value="every 5 min" color="#4c1" />
      <Badge label="status" value={ok ? "operational" : "stale"} color={ok ? "#4c1" : "#dfb317"} />
      <Badge label="stars" value={compactNumber(repo?.stars ?? 0)} color="#007ec6" />
      <Badge label="built with" value="Next.js 16" color="#24292f" />
    </p>
  );
}

async function HiringTable() {
  const data = await loadDevPageData();
  const top = topHiringCompanies(data.board);
  if (!top.length) return <p>The table fills in after the first check.</p>;
  return (
    <>
      <p>
        Open software engineering internships at top companies, posted in the last 45 days. Updated{" "}
        {data.board && formatDate(data.board.updatedAt)}.
      </p>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Open SWE roles</th>
            <th>Latest posting</th>
          </tr>
        </thead>
        <tbody>
          {top.map((c) => (
            <tr key={c.company}>
              <td>
                <Link href={`/?q=${encodeURIComponent(c.company)}#board`}>{c.company}</Link>
              </td>
              <td>{c.roles}</td>
              <td>
                <TimeAgo at={c.latest} colored={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

async function ApiSample() {
  const { board } = await loadDevPageData();
  const sample = board?.roles.find((r) => r.hot && r.swe);
  const response = JSON.stringify({ roles: sample ? [sample] : [], total: board ? board.roles.filter((r) => r.hot && r.swe).length : 0 }, null, 2);
  return (
    <>
      <CodeBlock code={`curl "${appUrl()}/api/roles?category=Software&hot=1&limit=1"`} lang="bash" />
      <p>Response (live, trimmed to one role):</p>
      <CodeBlock code={response} lang="json" />
    </>
  );
}

async function FaqSection() {
  const data = await loadDevPageData();
  return (
    <>
      {buildFaq(data).map((f) => (
        <div key={f.id}>
          <Heading id={`faq-${f.id}`} level={3}>
            {f.q}
          </Heading>
          <p>{f.a}</p>
        </div>
      ))}
    </>
  );
}

async function Sidebar() {
  const { repo, state } = await loadDevPageData();
  const ok = isOperational(state);
  const row = "flex items-center gap-2 text-sm text-gh-muted hover:text-gh-accent";
  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-4 border-b border-gh-border pb-6">
        <h2 className="text-base font-semibold">About</h2>
        <p className="text-base">Alerts on email, Telegram, Discord and WhatsApp when top companies open SWE internships. Free and open source.</p>
        <a href={appUrl()} className="flex items-center gap-2 font-semibold text-gh-accent hover:underline">
          <LinkIcon size={16} className="shrink-0" />
          <span className="truncate">{appUrl().replace(/^https?:\/\//, "")}</span>
        </a>
        {!!topics(repo).length && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
            {topics(repo).map((t) => (
              <li key={t}>
                <a
                  href={`https://github.com/topics/${t}`}
                  className="inline-block rounded-full bg-[color-mix(in_srgb,var(--gh-accent)_15%,transparent)] px-2.5 py-0.5 text-xs font-medium leading-[18px] text-gh-accent hover:bg-gh-accent hover:text-white"
                >
                  {t}
                </a>
              </li>
            ))}
          </ul>
        )}
        <ul className="space-y-2">
          <li>
            <a href="#readme" className={row}>
              <BookIcon size={16} /> Readme
            </a>
          </li>
          <li>
            <a href={`${REPO_HTML_URL}/blob/main/LICENSE`} className={row}>
              <LawIcon size={16} /> MIT license
            </a>
          </li>
          <li>
            <a href={`${REPO_HTML_URL}/stargazers`} className={row}>
              <StarIcon size={16} /> <strong className="text-gh-fg">{repo?.stars ?? 0}</strong> stars
            </a>
          </li>
          <li>
            <a href={`${REPO_HTML_URL}/watchers`} className={row}>
              <EyeIcon size={16} /> <strong className="text-gh-fg">{repo?.watchers ?? 0}</strong> watching
            </a>
          </li>
          <li>
            <a href={`${REPO_HTML_URL}/forks`} className={row}>
              <RepoForkedIcon size={16} /> <strong className="text-gh-fg">{repo?.forks ?? 0}</strong> forks
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-3 border-b border-gh-border pb-6">
        <h2 className="text-base font-semibold">Checker</h2>
        <p className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-gh-success" : "bg-gh-attention"}`} aria-hidden />
          <span className="font-semibold">{ok ? "Operational" : "Waiting for the scheduler"}</span>
        </p>
        <p className="text-gh-muted">
          {state.lastRunAt ? (
            <>
              Last check <TimeAgo at={state.lastRunAt} colored={false} />, {(state.runs ?? 0).toLocaleString()}{" "}
              {state.runs === 1 ? "check" : "checks"} so far.
            </>
          ) : (
            "No checks yet."
          )}
        </p>
      </section>


      <section className="space-y-3 border-b border-gh-border pb-6">
        <h2 className="text-base font-semibold">Deployments</h2>
        <a href={appUrl()} className="flex items-center gap-2 hover:text-gh-accent">
          <RocketIcon size={16} className="text-gh-success" /> Production on Vercel
        </a>
      </section>

      {!!repo?.languages.length && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Languages</h2>
          <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
            {repo.languages.map((l) => (
              <span key={l.name} style={{ width: `${l.percent}%`, background: LANGUAGE_COLORS[l.name] ?? "#8b949e" }} className="mr-0.5 last:mr-0" />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {repo.languages.map((l) => (
              <li key={l.name} className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: LANGUAGE_COLORS[l.name] ?? "#8b949e" }} aria-hidden />
                <span className="font-semibold">{l.name}</span> <span className="text-gh-muted">{l.percent}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

async function StructuredData() {
  const data = await loadDevPageData();
  const json = JSON.stringify(jsonLd(data, buildFaq(data))).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/* ------------------------------------------------------------------ page */

export default function DevPage() {
  return (
    <div className="gh-root min-h-dvh bg-gh-canvas font-gh text-gh-fg" data-theme="dark" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />

      <header className="border-b border-gh-border bg-gh-inset">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 pt-4 md:px-6 lg:px-8">
          <Link href="/" aria-label="Internship Radar home" className="shrink-0">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
              <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="8.5" fill="none" stroke="var(--gh-border)" strokeWidth="1.5" />
              <path d="M16 16 L27 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="22.5" cy="11" r="2.6" fill="var(--gh-success)" />
            </svg>
          </Link>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-base">
            <a href="https://github.com/kalk-ak" className="hidden truncate hover:underline sm:inline">
              kalk-ak
            </a>
            <span className="hidden text-gh-muted sm:inline">/</span>
            <a href={REPO_HTML_URL} className="truncate font-semibold hover:underline">
              internship-radar
            </a>
            <span className="ml-1 hidden rounded-full border border-gh-border px-2 text-xs font-medium leading-5 text-gh-muted sm:inline">
              Public
            </span>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="h-8 w-20" />}>
              <RepoButtons />
            </Suspense>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1280px] items-end gap-2 px-4 md:px-6 lg:px-8">
          <nav aria-label="Page sections" className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto pt-3">
            {TABS.map((t, i) => (
              <a
                key={t.href}
                href={t.href}
                aria-current={i === 0 ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-2 pb-2.5 pt-1 text-sm hover:border-gh-border ${
                  i === 0 ? "border-gh-tab font-semibold" : "border-transparent text-gh-fg/90"
                }`}
              >
                <t.icon size={16} className="text-gh-muted" />
                {t.label}
              </a>
            ))}
          </nav>
          <Link
            href="/#alerts"
            className="mb-2 hidden shrink-0 items-center gap-2 rounded-md bg-gh-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-gh-primary-hover sm:inline-flex"
          >
            Get alerts
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_256px] md:px-6 lg:grid-cols-[minmax(0,1fr)_296px] lg:gap-8 lg:px-8">
        <main className="min-w-0 space-y-6 md:col-start-1 md:row-start-1">
          <Box>
            <Suspense fallback={<div className="h-[45px] border-b border-gh-border bg-gh-subtle" />}>
              <LatestCommit />
            </Suspense>
            <ul className="divide-y divide-gh-border-muted text-sm">
              {FILES.map((f) => (
                <li key={f.path} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2 sm:grid-cols-[14rem_minmax(0,1fr)]">
                  <a
                    href={`${REPO_HTML_URL}/${f.dir ? "tree" : "blob"}/main/${f.path}`}
                    className="flex min-w-0 items-center gap-2 hover:text-gh-accent hover:underline"
                  >
                    {f.dir ? <FileDirectoryFillIcon size={16} className="shrink-0 text-gh-muted" /> : <FileIcon size={16} className="shrink-0 text-gh-muted" />}
                    <span className="truncate">{f.path}</span>
                  </a>
                  <span className="hidden truncate text-gh-muted sm:block">{f.note}</span>
                </li>
              ))}
            </ul>
          </Box>

          <Suspense fallback={<Skeleton className="h-48" />}>
            <ActivityCard />
          </Suspense>

          <Box>
            <div id="readme" className="flex scroll-mt-4 items-center gap-4 border-b border-gh-border px-4 text-sm">
              <span className="flex items-center gap-2 border-b-2 border-gh-tab py-3 font-semibold">
                <BookIcon size={16} /> README
              </span>
              <a href={`${REPO_HTML_URL}/blob/main/LICENSE`} className="flex items-center gap-2 py-3 text-gh-muted hover:text-gh-fg">
                <LawIcon size={16} /> MIT license
              </a>
            </div>

            <article className="gh-md px-4 py-6 sm:px-8 sm:py-8">
              <h1>Internship Radar: free SWE internship alerts</h1>
              <Suspense fallback={<Skeleton className="h-5 w-80" />}>
                <LiveBadges />
              </Suspense>
              <p>
                <strong>Internship Radar</strong> is a free, open-source bot that checks for new internship postings every 5
                minutes. When a FAANG+ company,
                top quant firm or AI lab opens a new software engineering internship, it alerts you on email, Telegram, Discord or
                WhatsApp, usually before the application pile forms.
              </p>
              <Suspense fallback={<Skeleton className="h-16" />}>
                <LiveSummary />
              </Suspense>

              <Heading id="get-alerts">Get alerts in 30 seconds</Heading>
              <ol>
                <li>
                  Open the <Link href="/#alerts">signup form</Link>. There&apos;s no account or password.
                </li>
                <li>Pick where alerts go: email, Telegram, Discord or WhatsApp. Choose as many as you like.</li>
                <li>Choose role types (software, AI/ML, quant, hardware, product) and whether to hear only about top companies.</li>
              </ol>
              <p>
                Every alert links to a private page where you can add channels, change filters, send yourself a test, or
                unsubscribe.
              </p>

              <Heading id="hiring-now">Top companies hiring SWE interns right now</Heading>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <HiringTable />
              </Suspense>

              <Heading id="how-it-works">How it works</Heading>
              <ol>
                <li>
                  GitHub Actions calls <code>POST /api/check</code> every 5 minutes. A Vercel schedule calls it every 15 minutes
                  as a backup.
                </li>
                <li>
                  The checker sends conditional requests for the internship list&apos;s <code>README.md</code> and the{" "}
                  <code>listings.json</code> it&apos;s generated from. A <code>304 Not Modified</code> ends the run.
                </li>
                <li>
                  When the list changes, open roles from the last 14 days are diffed against a Redis sorted set of IDs already
                  seen, so nothing alerts twice, even when both triggers fire at once.
                </li>
                <li>New roles are matched to each subscriber&apos;s filters, grouped by company and sent to every confirmed channel.</li>
              </ol>
              <CodeBlock code={DIAGRAM} lang="text" />

              <Heading id="channels">Notification channels</Heading>
              <table>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>How you connect</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Email</td>
                    <td>Enter your address and click the confirmation link</td>
                    <td>Sent through Gmail SMTP</td>
                  </tr>
                  <tr>
                    <td>Telegram</td>
                    <td>Press Start on the bot</td>
                    <td>
                      <code>/latest</code>, <code>/status</code>, <code>/stop</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Discord</td>
                    <td>Paste a channel webhook URL</td>
                    <td>One embed per company</td>
                  </tr>
                  <tr>
                    <td>WhatsApp</td>
                    <td>Phone number, plus a free CallMeBot key</td>
                    <td>Meta Cloud API supported too</td>
                  </tr>
                  <tr>
                    <td>Instagram</td>
                    <td>Follow the account</td>
                    <td>Posts image cards, since bots can&apos;t DM first</td>
                  </tr>
                </tbody>
              </table>

              <Heading id="api">Public API</Heading>
              <p>
                Open roles are available as JSON. Filter with <code>category</code> (<code>Software</code>,{" "}
                <code>AI/ML/Data</code>, <code>Quant</code>, <code>Hardware</code>, <code>Product</code> or <code>all</code>),{" "}
                <code>hot=0|1</code>, <code>q</code>, <code>offset</code> and <code>limit</code> (max 100). Responses are cached
                for 60 seconds.
              </p>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <ApiSample />
              </Suspense>
              <p>
                Building with an LLM? <a href="/llms.txt">/llms.txt</a> has a plain-text summary of this project with live numbers.
              </p>

              <Heading id="faq">FAQ</Heading>
              <Suspense fallback={<Skeleton className="h-96" />}>
                <FaqSection />
              </Suspense>

              <Heading id="self-host">Self-host</Heading>
              <p>
                Everything runs on free tiers: Vercel Hobby, Upstash Redis and GitHub Actions. Fork the repo, import it on Vercel,
                connect Upstash Redis, and set <code>APP_SECRET</code>, <code>CRON_SECRET</code> and <code>ADMIN_PASSWORD</code>.
                The <a href={`${REPO_HTML_URL}#deploy-your-own`}>deploy guide</a> walks through each step.
              </p>
              <CodeBlock code={SELF_HOST} lang="bash" />

              <Heading id="contributing">Contributing</Heading>
              <p>
                Issues and pull requests are welcome. Run <code>npm test</code>, <code>npm run lint</code> and{" "}
                <code>npm run typecheck</code> before opening a PR. CI runs the same checks plus a production build.
              </p>

              <Heading id="license">License</Heading>
              <p>
                MIT. Use it, fork it, ship your own version. If it helps you land an internship, a star on{" "}
                <a href={REPO_HTML_URL}>GitHub</a> is appreciated.
              </p>
            </article>
          </Box>
        </main>

        <aside className="md:col-start-2 md:row-start-1" aria-label="About this project">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <Sidebar />
          </Suspense>
        </aside>
      </div>

      <footer className="border-t border-gh-border">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-8 text-xs text-gh-muted sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
          <p className="flex items-center gap-2">
            <CheckCircleFillIcon size={16} className="text-gh-success" /> Internship Radar, open source under MIT
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/" className="hover:text-gh-accent hover:underline">
              App
            </Link>
            <a href={REPO_HTML_URL} className="hover:text-gh-accent hover:underline">
              GitHub
            </a>
            <a href="/api/roles?limit=5" className="hover:text-gh-accent hover:underline">
              API
            </a>
            <a href="/llms.txt" className="hover:text-gh-accent hover:underline">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="hover:text-gh-accent hover:underline">
              Sitemap
            </a>
          </nav>
        </div>
      </footer>

      <Suspense>
        <StructuredData />
      </Suspense>
    </div>
  );
}
