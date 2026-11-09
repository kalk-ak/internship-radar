import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Board } from "@/components/board";
import { CodeBlock } from "@/components/dev/copy-button";
import { LatestDrops, LatestDropsSkeleton } from "@/components/latest-drops";
import { SignupForm } from "@/components/signup-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { parseBoardQuery, queryBoard } from "@/lib/board";
import { BOARD_WINDOW_MS, getBoard } from "@/lib/checker";
import { appUrl } from "@/lib/env";
import { publicChannelConfig } from "@/lib/public-config";

export const metadata: Metadata = { alternates: { canonical: "/" } };

async function Counts() {
  await connection();
  const board = await getBoard();
  if (!board) return null;
  const swe = board.totals.byCategory.Software ?? 0;
  return (
    <p className="font-data text-[0.8rem] text-muted">
      <span className="text-ink">{swe.toLocaleString("en-US")}</span> open swe internships,{" "}
      <span className="text-ink">{board.totals.hot.toLocaleString("en-US")}</span> roles at{" "}
      <span className="text-ink">{board.totals.hotCompanies}</span> top companies
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
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <p role="status" className="rounded-lg border border-rule bg-panel px-4 py-3 text-sm text-ink-soft">
        {text}
      </p>
    </div>
  );
}

function SectionTitle({ id, children, intro }: { id?: string; children: ReactNode; intro: ReactNode }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 id={id} className="font-head text-3xl font-bold text-ink sm:text-[2.4rem] sm:leading-[1.1]">
        {children}
      </h2>
      <p className="mt-3 text-ink-soft">{intro}</p>
    </div>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <Notice searchParams={props.searchParams} />
      </Suspense>
      <main>
        <section className="relative overflow-hidden">
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pb-28 lg:pt-20">
            <div className="flex flex-col gap-7">
              <h1 className="font-head text-[2.35rem] font-bold leading-[1.05] text-ink sm:text-[3.4rem]">
                Get pinged when top companies open SWE internships.
              </h1>
              <p className="max-w-xl text-lg text-ink-soft">
                Internship Radar checks for new postings every 5 minutes. When Google, Jane Street, OpenAI or another top
                company opens a role, you hear about it on email, Telegram, Discord or WhatsApp while the applicant pile is
                still small. Free and open source.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="#alerts" className="rounded-lg bg-accent px-5 py-3 font-semibold text-accent-ink transition-colors hover:bg-accent-hover">
                  Get alerts
                </a>
                <a href="#board" className="rounded-lg border border-rule-strong px-5 py-3 font-semibold text-ink transition-colors hover:border-ink-soft hover:bg-wash">
                  Browse open roles
                </a>
              </div>
              <Suspense fallback={<p className="h-5" />}>
                <Counts />
              </Suspense>
            </div>
            <div className="min-w-0">
              <Suspense fallback={<LatestDropsSkeleton />}>
                <LatestDrops />
              </Suspense>
            </div>
          </div>
        </section>

        <section id="board" className="scroll-mt-16 border-t border-rule">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionTitle
              intro={
                <>
                  Everything posted in the last {Math.round(BOARD_WINDOW_MS / 86_400_000)} days that&apos;s still accepting
                  applications. Apply links go straight to the company. Press <kbd className="font-data rounded border border-rule-strong bg-panel px-1.5 py-0.5 text-xs text-ink">/</kbd> to search.
                </>
              }
            >
              Open roles
            </SectionTitle>
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-panel motion-reduce:animate-none" />}>
              <BoardSection searchParams={props.searchParams} />
            </Suspense>
          </div>
        </section>

        <section id="alerts" className="scroll-mt-16 border-t border-rule">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SectionTitle intro="Pick where alerts go and which roles count. A big drop arrives as one message per company, not twenty.">
                Get alerts
              </SectionTitle>
              <ul className="font-data space-y-2 text-[0.8rem] text-ink-soft">
                <li>
                  <span className="text-accent">✓</span> checks every 5 minutes
                </li>
                <li>
                  <span className="text-accent">✓</span> no account, no password
                </li>
                <li>
                  <span className="text-accent">✓</span> unsubscribe from any alert
                </li>
              </ul>
              <div className="mt-10 hidden lg:block">
                <p className="mb-2 text-sm text-muted">Prefer raw data? The same roles are available as JSON.</p>
                <CodeBlock code={`curl "${appUrl()}/api/roles?hot=1&limit=5"`} wrap />
              </div>
            </div>
            <div className="rounded-xl border border-rule bg-panel p-5 sm:p-8">
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
