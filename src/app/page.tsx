import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Board } from "@/components/board";
import { LatestDrops, LatestDropsSkeleton } from "@/components/latest-drops";
import { SignupForm } from "@/components/signup-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { parseBoardQuery, queryBoard } from "@/lib/board";
import { BOARD_WINDOW_MS, getBoard } from "@/lib/checker";
import { publicChannelConfig } from "@/lib/public-config";

export const metadata: Metadata = { alternates: { canonical: "/" } };

async function Counts() {
  await connection();
  const board = await getBoard();
  if (!board) return null;
  const swe = board.totals.byCategory.Software ?? 0;
  return (
    <p className="text-sm text-muted">
      Right now: <span className="font-semibold text-ink">{swe.toLocaleString("en-US")}</span> open software engineering
      internships, <span className="font-semibold text-ink">{board.totals.hot.toLocaleString("en-US")}</span> of them at top companies.
    </p>
  );
}

const STEPS = [
  { title: "Choose where to get alerts", body: "Email, Telegram, Discord or WhatsApp. Pick one or several." },
  { title: "We watch for new roles", body: "Every 5 minutes we check for new internships at about 100 top companies." },
  { title: "Apply before the rush", body: "You get a message with direct apply links as soon as a role opens." },
];

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
      <h2 id={id} className="font-head text-3xl font-bold text-ink sm:text-4xl">
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
        <section>
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
            <div className="flex flex-col gap-6">
              <h1 className="font-head text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
                Get alerts when top companies open software engineering internships.
              </h1>
              <p className="max-w-xl text-lg text-ink-soft">
                We check for new internship postings every 5 minutes and message you when companies like Google, Meta or Jane
                Street open a role. Free, and no account needed.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="#alerts" className="rounded-lg bg-accent px-5 py-3 font-semibold text-accent-ink transition-colors hover:bg-accent-hover">
                  Get free alerts
                </a>
                <a href="#board" className="rounded-lg border border-rule-strong px-5 py-3 font-semibold text-ink transition-colors hover:border-ink-soft hover:bg-wash">
                  See open roles
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
          <div className="border-y border-rule bg-panel/60">
            <ol className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hot-wash text-sm font-bold text-accent" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold text-ink">{step.title}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="board" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionTitle
              intro={`Internships posted in the last ${Math.round(BOARD_WINDOW_MS / 86_400_000)} days that are still open. Click Apply to go straight to the company's application.`}
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
              <SectionTitle intro="Tell us where to send alerts and which roles you care about. It takes about a minute.">
                Get free alerts
              </SectionTitle>
              <ul className="space-y-3 text-ink-soft">
                {["Free, with no account or password", "One message per company, even when many roles open at once", "Change or stop alerts anytime from a link in every message"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 text-accent" aria-hidden>
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
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
