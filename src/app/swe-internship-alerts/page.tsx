import { EyeIcon, GitCommitIcon, RepoForkedIcon, StarIcon } from "@primer/octicons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CodeBlock } from "@/components/dev/copy-button";
import { ContributionGraph } from "@/components/dev/contribution-graph";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TimeAgo } from "@/components/time-ago";
import { appUrl } from "@/lib/env";
import { compactNumber, PROJECT_REPO } from "@/lib/github";
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

const TOC = [
  ["get-alerts", "Get alerts"],
  ["hiring-now", "Hiring right now"],
  ["how-it-works", "How it works"],
  ["channels", "Channels"],
  ["api", "Public API"],
  ["faq", "FAQ"],
  ["self-host", "Self-host"],
  ["license", "License"],
] as const;

const LANGUAGE_COLORS: Record<string, string> = { TypeScript: "#7aa2ff", CSS: "#c39bff", JavaScript: "#f2d36b" };

const DIAGRAM = `qstash (every 5m)         vercel function               internship list
*/5 * * * *  ──POST──▶  /api/check  ──If-None-Match──▶  README.md
                            │                            listings.json
                            │◀─── 304 Not Modified ──────┘   done in ~50 ms
                            │◀─── 200 + new listings
                            ▼
                  diff against redis seen-set
                  match each subscriber's filters
                            ▼
      email    telegram    discord    whatsapp    instagram`;

const SELF_HOST = `git clone ${REPO_HTML_URL}.git
cd internship-radar
npm install
npm run dev                              # http://localhost:3000
curl -X POST localhost:3000/api/check    # run a check locally`;

const LAYOUT = `src/
  app/          pages, admin dashboard, API routes
  lib/          checker, matching, channel senders
  components/   UI
tests/          vitest suites (no network)
.github/        5-minute trigger + CI
vercel.json     15-minute backup schedule`;

/* ------------------------------------------------------------ primitives */

function Badge({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "ok" | "warn" | "accent" }) {
  const toneClass = { default: "text-ink", ok: "text-ok", warn: "text-hot-text", accent: "text-accent" }[tone];
  return (
    <span className="font-data inline-flex overflow-hidden rounded-md border border-rule-strong text-[0.7rem] leading-6">
      <span className="bg-wash px-2 text-muted">{label}</span>
      <span className={`px-2 ${toneClass}`}>{value}</span>
    </span>
  );
}

function Heading({ id, level = 2, children }: { id: string; level?: 2 | 3; children: ReactNode }) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id}>
      <a href={`#${id}`} className="anchor" aria-hidden tabIndex={-1}>
        #
      </a>
      {children}
    </Tag>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-panel motion-reduce:animate-none ${className}`} />;
}

/* ------------------------------------------------------------ live parts */

async function HeroMeta() {
  const { repo, state, board } = await loadDevPageData();
  const ok = isOperational(state);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge label="license" value="MIT" />
        <Badge label="checks" value="every 5 min" tone="accent" />
        <Badge label="status" value={ok ? "operational" : "waiting"} tone={ok ? "ok" : "warn"} />
        <Badge label="stars" value={compactNumber(repo?.stars ?? 0)} />
      </div>
      {board && (
        <p className="font-data text-[0.8rem] text-muted">
          <span className="text-ink">{(board.totals.byCategory.Software ?? 0).toLocaleString("en-US")}</span> open swe internships right
          now, <span className="text-ink">{board.totals.hot.toLocaleString("en-US")}</span> at{" "}
          <span className="text-ink">{board.totals.hotCompanies}</span> top companies
        </p>
      )}
    </>
  );
}

async function StarButton() {
  const { repo } = await loadDevPageData();
  return (
    <a
      href={REPO_HTML_URL}
      className="inline-flex items-center gap-2 rounded-lg border border-rule-strong px-4 py-3 font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
      aria-label={`Star ${PROJECT_REPO} on GitHub, ${repo?.stars ?? 0} stars`}
    >
      <StarIcon size={16} /> Star on GitHub
      <span className="font-data rounded-md bg-wash px-1.5 text-xs text-ink-soft">{compactNumber(repo?.stars ?? 0)}</span>
    </a>
  );
}

async function RepoCard() {
  const { repo } = await loadDevPageData();
  const c = repo?.lastCommit;
  const stat = "flex items-center gap-1.5 text-muted transition-colors hover:text-ink";
  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-panel">
      <div className="border-b border-rule px-5 py-4">
        <a href={REPO_HTML_URL} className="font-data text-[0.9rem] font-semibold text-ink hover:text-accent">
          {PROJECT_REPO}
        </a>
        <p className="mt-1.5 text-sm text-ink-soft">Alerts on email, Telegram, Discord and WhatsApp when top companies open SWE internships.</p>
        <div className="font-data mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.75rem]">
          <a href={`${REPO_HTML_URL}/stargazers`} className={stat}>
            <StarIcon size={14} /> <span className="text-ink">{repo?.stars ?? 0}</span> stars
          </a>
          <a href={`${REPO_HTML_URL}/forks`} className={stat}>
            <RepoForkedIcon size={14} /> <span className="text-ink">{repo?.forks ?? 0}</span> forks
          </a>
          <a href={`${REPO_HTML_URL}/watchers`} className={stat}>
            <EyeIcon size={14} /> <span className="text-ink">{repo?.watchers ?? 0}</span> watching
          </a>
        </div>
      </div>
      {c && (
        <a href={`${REPO_HTML_URL}/commit/${c.sha}`} className="flex items-center gap-3 border-b border-rule px-5 py-3 text-sm transition-colors hover:bg-wash">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.avatarUrl ? `${c.avatarUrl}${c.avatarUrl.includes("?") ? "&" : "?"}s=40` : `https://avatars.githubusercontent.com/${c.author}?s=40`}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 shrink-0 rounded-full bg-wash"
          />
          <span className="min-w-0 flex-1 truncate text-ink-soft">{c.message}</span>
          <span className="font-data hidden shrink-0 items-center gap-1.5 text-[0.72rem] text-muted sm:flex">
            <GitCommitIcon size={14} /> {c.sha.slice(0, 7)}, <TimeAgo at={Date.parse(c.date)} colored={false} short />
          </span>
        </a>
      )}
      {!!repo?.languages.length && (
        <div className="px-5 py-4">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-wash" aria-hidden>
            {repo.languages.map((l) => (
              <span key={l.name} style={{ width: `${l.percent}%`, background: LANGUAGE_COLORS[l.name] ?? "#7c859e" }} />
            ))}
          </div>
          <ul className="font-data mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.72rem]">
            {repo.languages.map((l) => (
              <li key={l.name} className="flex items-center gap-1.5 text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: LANGUAGE_COLORS[l.name] ?? "#7c859e" }} aria-hidden />
                {l.name.toLowerCase()} <span className="text-muted">{l.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

async function ActivityCard() {
  const { activity } = await loadDevPageData();
  if (!activity) {
    return <p className="rounded-xl border border-rule bg-panel p-5 text-sm text-muted">The activity graph fills in after the next listings update.</p>;
  }
  const total = activity.days.reduce((a, [, n]) => a + n, 0);
  const hot = activity.days.reduce((a, [, , h]) => a + h, 0);
  return (
    <section aria-labelledby="activity-title">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-title" className="font-head text-xl font-bold text-ink">
          {total.toLocaleString("en-US")} SWE internships posted this year
        </h2>
        <p className="font-data text-[0.75rem] text-muted">
          <span className="text-accent">{hot.toLocaleString("en-US")}</span> at top companies
        </p>
      </div>
      <div className="rounded-xl border border-rule bg-panel p-5">
        <ContributionGraph activity={activity} />
        <p className="mt-3 text-xs text-muted">One square per day of new software engineering internship postings, in Pacific time. Hover for counts.</p>
      </div>
    </section>
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
            <th>company</th>
            <th>open swe roles</th>
            <th>latest posting</th>
          </tr>
        </thead>
        <tbody>
          {top.map((c) => (
            <tr key={c.company}>
              <td>
                <Link href={`/?q=${encodeURIComponent(c.company)}#board`}>{c.company}</Link>
              </td>
              <td className="font-data">{c.roles}</td>
              <td>
                <TimeAgo at={c.latest} />
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
      <CodeBlock code={`curl "${appUrl()}/api/roles?category=Software&hot=1&limit=1"`} lang="bash" wrap />
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

async function StructuredData() {
  const data = await loadDevPageData();
  const json = JSON.stringify(jsonLd(data, buildFaq(data))).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/* ------------------------------------------------------------------ page */

export default function DevPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-rule">
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:pt-20">
            <div className="flex flex-col gap-6">
              <p className="font-data text-[0.8rem] text-muted">
                <span className="text-accent">~/</span>developers
              </p>
              <h1 className="font-head text-[2.2rem] font-bold leading-[1.06] text-ink sm:text-5xl">
                Free SWE internship alerts. Open source, built to fork.
              </h1>
              <p className="max-w-xl text-lg text-ink-soft">
                <strong className="font-semibold text-ink">Internship Radar</strong> checks for new internship postings every 5
                minutes. When a FAANG+ company, top quant firm or AI lab opens a software engineering internship, it alerts you on
                email, Telegram, Discord or WhatsApp. It&apos;s a Next.js app on Vercel&apos;s free tier, MIT-licensed.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/#alerts" className="rounded-lg bg-accent px-5 py-3 font-semibold text-accent-ink transition-colors hover:bg-accent-hover">
                  Get alerts
                </Link>
                <Suspense fallback={<Skeleton className="h-12 w-48" />}>
                  <StarButton />
                </Suspense>
              </div>
              <Suspense fallback={<Skeleton className="h-14 w-full max-w-md" />}>
                <HeroMeta />
              </Suspense>
            </div>
            <Suspense fallback={<Skeleton className="h-72" />}>
              <RepoCard />
            </Suspense>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Suspense fallback={<Skeleton className="h-52" />}>
            <ActivityCard />
          </Suspense>

          <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
            <nav aria-label="On this page" className="font-data hidden text-[0.78rem] lg:block">
              <div className="sticky top-24">
                <p className="mb-3 text-muted">on this page</p>
                <ul className="space-y-2 border-l border-rule">
                  {TOC.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`} className="-ml-px block border-l border-transparent pl-4 text-ink-soft transition-colors hover:border-accent hover:text-ink">
                        {label.toLowerCase()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <article className="prose-dev min-w-0 max-w-3xl">
              <Heading id="get-alerts">Get alerts in 30 seconds</Heading>
              <ol>
                <li>
                  Open the <Link href="/#alerts">signup form</Link>. There&apos;s no account or password.
                </li>
                <li>Pick where alerts go: email, Telegram, Discord or WhatsApp. Choose as many as you like.</li>
                <li>Choose role types (software, AI/ML, quant, hardware, product) and whether to hear only about top companies.</li>
              </ol>
              <p>Every alert links to a private page where you can add channels, change filters, send yourself a test, or unsubscribe.</p>

              <Heading id="hiring-now">Top companies hiring SWE interns right now</Heading>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <HiringTable />
              </Suspense>

              <Heading id="how-it-works">How it works</Heading>
              <ol>
                <li>
                  An Upstash QStash schedule calls <code>POST /api/check</code> every 5 minutes with a signed request. A Vercel
                  schedule calls it every 15 minutes as a backup.
                </li>
                <li>
                  The checker sends conditional requests for the internship list&apos;s <code>README.md</code> and the{" "}
                  <code>listings.json</code> it&apos;s generated from. A <code>304 Not Modified</code> ends the run.
                </li>
                <li>
                  When the list changes, open roles from the last 14 days are diffed against a Redis sorted set of IDs already seen,
                  so nothing alerts twice, even when both triggers fire at once.
                </li>
                <li>New roles are matched to each subscriber&apos;s filters, grouped by company and sent to every confirmed channel.</li>
              </ol>
              <CodeBlock code={DIAGRAM} lang="text" />

              <Heading id="channels">Notification channels</Heading>
              <table>
                <thead>
                  <tr>
                    <th>channel</th>
                    <th>how you connect</th>
                    <th>notes</th>
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
                    <td>Phone number plus a free CallMeBot key</td>
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
                Open roles are available as JSON. Filter with <code>category</code> (<code>Software</code>, <code>AI/ML/Data</code>,{" "}
                <code>Quant</code>, <code>Hardware</code>, <code>Product</code> or <code>all</code>), <code>hot=0|1</code>, <code>q</code>,{" "}
                <code>offset</code> and <code>limit</code> (max 100). Responses are cached for 60 seconds.
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
                connect Upstash Redis, and set <code>APP_SECRET</code>, <code>CRON_SECRET</code> and <code>ADMIN_PASSWORD</code>. The{" "}
                <a href={`${REPO_HTML_URL}#deploy-your-own`}>deploy guide</a> walks through each step.
              </p>
              <CodeBlock code={SELF_HOST} lang="bash" />
              <p>Project layout:</p>
              <CodeBlock code={LAYOUT} lang="text" />
              <p>
                Issues and pull requests are welcome. Run <code>npm test</code>, <code>npm run lint</code> and <code>npm run typecheck</code>{" "}
                before opening a PR; CI runs the same checks plus a production build.
              </p>

              <Heading id="license">License</Heading>
              <p>
                MIT. Use it, fork it, ship your own version. If it helps you land an internship, a star on <a href={REPO_HTML_URL}>GitHub</a>{" "}
                is appreciated.
              </p>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
      <Suspense>
        <StructuredData />
      </Suspense>
    </>
  );
}
