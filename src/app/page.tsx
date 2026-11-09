import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Board } from "@/components/board";
import { LatestDrops, LatestDropsSkeleton } from "@/components/latest-drops";
import { SignupForm } from "@/components/signup-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TimeAgo } from "@/components/time-ago";
import { parseBoardQuery, queryBoard } from "@/lib/board";
import { BOARD_WINDOW_MS, getBoard, getState } from "@/lib/checker";
import { publicChannelConfig } from "@/lib/public-config";

/** No successful check for 30 minutes means the scheduler has stalled. */
function isStale(lastRunAt: number) {
  return Date.now() - lastRunAt > 30 * 60 * 1000;
}

async function StatusLine() {
  await connection();
  const state = await getState();
  if (!state.lastRunAt) return <p className="text-sm text-muted">Waiting for the first check.</p>;
  const stale = isStale(state.lastRunAt);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
      <span className={`live-dot relative inline-block h-2 w-2 rounded-full ${stale ? "text-cool" : "text-ok"}`} style={{ background: "currentColor" }} aria-hidden />
      <span>
        Last checked <TimeAgo at={state.lastRunAt} colored={false} className="font-semibold text-ink" />
        .
      </span>
    </p>
  );
}

async function Counts() {
  await connection();
  const board = await getBoard();
  if (!board) return null;
  const swe = board.totals.byCategory.Software ?? 0;
  return (
    <p className="max-w-xl text-ink-soft">
      Right now the list has <strong className="text-ink">{swe.toLocaleString()} open software internships</strong> and{" "}
      {board.totals.hot.toLocaleString()} roles across {board.totals.hotCompanies} top companies.
    </p>
  );
}

async function BoardSection({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (typeof sp.q === "string") params.set("q", sp.q);
  const query = parseBoardQuery(params);
  const initial = queryBoard(await getBoard(), query);
  return <Board initial={initial} initialQuery={{ category: query.category, hotOnly: query.hotOnly, q: query.q }} />;
}

async function Signup() {
  await connection();
  return <SignupForm config={await publicChannelConfig()} />;
}

async function Notice({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const text = sp.unsubscribed
    ? "You're unsubscribed. No more alerts will be sent."
    : sp.verify === "expired"
      ? "That confirmation link has expired or was already used. Sign up again or open your manage page to resend it."
      : null;
  if (!text) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <p role="status" className="rounded-xl bg-wash px-4 py-3 text-sm font-medium">
        {text}
      </p>
    </div>
  );
}

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home(props: PageProps<"/">) {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <Notice searchParams={props.searchParams} />
      </Suspense>
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:pt-16">
          <div className="flex flex-col gap-6 lg:pt-4">
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight [font-variation-settings:'wdth'_112] sm:text-6xl">
              Get a message when top companies open SWE internships.
            </h1>
            <p className="max-w-xl text-lg text-ink-soft">
              Internship Radar checks for new internship postings every 5 minutes. When Google, Jane Street, OpenAI or
              another top company posts a new role, you hear about it on email, Telegram, Discord or WhatsApp, usually
              before the applicant pile forms.
            </p>
            <Suspense fallback={<p className="h-12" />}>
              <Counts />
            </Suspense>
            <div className="flex flex-wrap items-center gap-3">
              <a href="#alerts" className="rounded-xl bg-ink px-5 py-3 font-semibold text-paper hover:opacity-90">
                Get alerts
              </a>
              <a href="#board" className="rounded-xl border border-rule-strong px-5 py-3 font-semibold hover:border-ink">
                Browse open roles
              </a>
            </div>
            <Suspense fallback={<p className="h-5" />}>
              <StatusLine />
            </Suspense>
          </div>
          <div className="min-w-0 border-t border-rule pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-2">
            <Suspense fallback={<LatestDropsSkeleton />}>
              <LatestDrops />
            </Suspense>
          </div>
        </section>

        <section id="board" className="scroll-mt-4 border-t border-rule bg-panel/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mb-8 max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight [font-variation-settings:'wdth'_110] sm:text-4xl">
                Open roles
              </h2>
              <p className="mt-2 text-ink-soft">
                Everything posted in the last {Math.round(BOARD_WINDOW_MS / 86_400_000)} days that&apos;s still accepting
                applications. Apply links go straight to the company.
              </p>
            </div>
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-wash motion-reduce:animate-none" />}>
              <BoardSection searchParams={props.searchParams} />
            </Suspense>
          </div>
        </section>

        <section id="alerts" className="scroll-mt-4 border-t border-rule">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <h2 className="font-display text-3xl font-extrabold tracking-tight [font-variation-settings:'wdth'_110] sm:text-4xl">
                Get alerts
              </h2>
              <p className="mt-3 text-ink-soft">
                Choose where alerts go and which roles count. Alerts arrive within about 5 minutes of a role being listed,
                grouped by company so a big drop is one message, not twenty.
              </p>
              <p className="mt-4 text-sm text-muted">
                Free, no account needed. Every alert has a link to change your settings or unsubscribe.
              </p>
            </div>
            <div className="rounded-2xl border border-rule bg-paper p-5 sm:p-8">
              <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-xl bg-wash motion-reduce:animate-none" />}>
                <Signup />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
