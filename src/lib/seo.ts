import { connection } from "next/server";
import { cache } from "react";
import { busiestMonth, type Activity } from "./activity";
import { getActivity, getBoard, getState } from "./checker";
import { DEFAULT_HOT_COMPANIES } from "./companies";
import { appUrl } from "./env";
import { PROJECT_REPO, repoStats, type RepoStats } from "./github";
import type { BoardSnapshot, CheckState } from "./types";

export const DEV_PAGE_PATH = "/swe-internship-alerts";
export const SITE_NAME = "Internship Radar";
export const REPO_HTML_URL = `https://github.com/${PROJECT_REPO}`;
export const AUTHOR = { name: "Kaleb Aklilu", url: "https://github.com/kalk-ak" };

export const DEV_PAGE_TITLE = "Free SWE internship alerts for FAANG+ and top quant firms";
export const DEV_PAGE_DESCRIPTION =
  "Open-source bot that checks for new internship postings every 5 minutes and alerts you on email, Telegram, Discord or WhatsApp when FAANG+, top quant firms and AI labs open SWE internships.";

export interface DevPageData {
  board: BoardSnapshot | null;
  state: CheckState;
  activity: Activity | null;
  repo: RepoStats | null;
}

/** One load per request, shared by every section of the page. */
export const loadDevPageData = cache(async (): Promise<DevPageData> => {
  await connection();
  const [board, state, activity, repo] = await Promise.all([getBoard(), getState(), getActivity(), repoStats()]);
  return { board, state, activity, repo };
});

export interface CompanyCount {
  company: string;
  roles: number;
  latest: number;
}

export function topHiringCompanies(board: BoardSnapshot | null, limit = 12): CompanyCount[] {
  if (!board) return [];
  const map = new Map<string, CompanyCount>();
  for (const r of board.roles) {
    if (!r.hot || !r.swe) continue;
    const c = map.get(r.company) ?? { company: r.company, roles: 0, latest: 0 };
    c.roles += 1;
    c.latest = Math.max(c.latest, r.postedAt);
    map.set(r.company, c);
  }
  return [...map.values()].sort((a, b) => b.roles - a.roles || b.latest - a.latest).slice(0, limit);
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
}

function monthName(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export interface Faq {
  id: string;
  q: string;
  a: string;
}

/** Question-first answers: the first sentence answers on its own, for search snippets and AI answer engines. */
export function buildFaq(data: DevPageData): Faq[] {
  const url = appUrl();
  const season = data.state.repo?.match(/Summer(\d{4})/)?.[1] ?? "2027";
  const swe = data.board?.totals.byCategory.Software ?? 0;
  const asOf = data.board ? formatDate(data.board.updatedAt) : null;
  const top = topHiringCompanies(data.board, 8);
  const peak = data.activity ? busiestMonth(data.activity) : null;

  const faqs: Faq[] = [
    {
      id: "get-notified",
      q: "How do I get notified when Google or other FAANG companies open SWE internships?",
      a: `Sign up for free at ${url} and pick email, Telegram, Discord or WhatsApp. Internship Radar checks for new internship postings every 5 minutes and messages you when a FAANG+ company, top quant firm or AI lab posts a new software engineering internship, grouped by company so a big drop arrives as one message.`,
    },
    {
      id: "how-often",
      q: "How often does Internship Radar check for new internships?",
      a: "Every 5 minutes. An Upstash QStash schedule triggers a check on Vercel, and a Vercel schedule runs every 15 minutes as a backup. Each check uses conditional HTTP requests (ETag), so when the list hasn't changed it finishes in milliseconds.",
    },
    {
      id: "top-companies",
      q: "Which companies count as top companies?",
      a: `About ${Math.round(DEFAULT_HOT_COMPANIES.length / 10) * 10} companies. That's the FAANG+ group (including Google, Meta, Apple, Amazon, Microsoft, Netflix, NVIDIA, OpenAI, Anthropic and Stripe), plus top quant firms such as Jane Street, Citadel, Two Sigma and Hudson River Trading, and leading AI labs. Subscribers can add any other company to their own watch list.`,
    },
  ];

  if (top.length) {
    faqs.push({
      id: "hiring-now",
      q: "Which top companies are hiring SWE interns right now?",
      a: `As of ${asOf}, the top companies with the most open software engineering internship listings posted in the last 45 days are ${top
        .map((c) => `${c.company} (${c.roles})`)
        .join(", ")}. Across the whole list there are ${swe.toLocaleString()} open software engineering internships.`,
    });
  }

  faqs.push({
    id: "when-open",
    q: `When do Summer ${season} SWE internship applications open?`,
    a: `Big tech companies usually open summer internships in the late summer and fall of the year before, and popular roles can close within weeks.${
      peak ? ` In the past year, the busiest month for new SWE internship postings was ${monthName(peak.month)}, with ${peak.count.toLocaleString()} postings.` : ""
    } Setting up alerts early is the easiest way not to miss them.`,
  });

  faqs.push(
    {
      id: "free",
      q: "Is Internship Radar free?",
      a: "Yes. It's free to use and MIT-licensed open source. It runs on the free tiers of Vercel, Upstash Redis and GitHub Actions, so you can also host your own copy at no cost.",
    },
    {
      id: "channels",
      q: "Which notification channels are supported?",
      a: "Email, Telegram, Discord (through a channel webhook) and WhatsApp (through Meta's Cloud API or the free CallMeBot service). Hot SWE drops are also posted to Instagram, because Instagram doesn't let bots message people first.",
    },
    {
      id: "off-season",
      q: "Does it cover off-season and international internships?",
      a: "Yes. It tracks fall, winter and spring terms as well as summer, plus roles outside the US. Every alert shows the term and location, and you can choose categories such as software, AI/ML, quant, hardware or product.",
    },
    {
      id: "api",
      q: "Can I use the internship data in my own project?",
      a: `Yes. GET ${url}/api/roles returns open roles as JSON, filterable by category, top companies and search text. Please cache responses.`,
    },
  );
  return faqs;
}

export function jsonLd(data: DevPageData, faqs: Faq[]) {
  const url = appUrl();
  const pageUrl = `${url}${DEV_PAGE_PATH}`;
  const person = { "@type": "Person", "@id": `${url}#author`, name: AUTHOR.name, url: AUTHOR.url };
  const modified = data.state.lastChangeAt ?? data.board?.updatedAt;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}#website`, url, name: SITE_NAME, inLanguage: "en" },
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: DEV_PAGE_TITLE,
        description: DEV_PAGE_DESCRIPTION,
        isPartOf: { "@id": `${url}#website` },
        about: { "@id": `${url}#app` },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        ...(modified && { dateModified: new Date(modified).toISOString() }),
        author: { "@id": `${url}#author` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: url },
          { "@type": "ListItem", position: 2, name: "SWE internship alerts", item: pageUrl },
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#app`,
        name: SITE_NAME,
        url,
        description: DEV_PAGE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        license: "https://opensource.org/licenses/MIT",
        author: { "@id": `${url}#author` },
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${REPO_HTML_URL}#code`,
        name: "internship-radar",
        codeRepository: REPO_HTML_URL,
        programmingLanguage: "TypeScript",
        runtimePlatform: "Node.js",
        license: "https://opensource.org/licenses/MIT",
        targetProduct: { "@id": `${url}#app` },
        author: { "@id": `${url}#author` },
        ...(data.repo && {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/LikeAction",
            userInteractionCount: data.repo.stars,
          },
        }),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      person,
    ],
  };
}

/** The scheduler is healthy if a check ran in the last 30 minutes. */
export function isOperational(state: CheckState) {
  return Boolean(state.lastRunAt && Date.now() - state.lastRunAt < 30 * 60 * 1000);
}
