import { makeCompanyMatcher, DEFAULT_HOT_COMPANIES } from "./companies";
import { SIMPLIFY_OWNER } from "./env";
import type { Category, RawListing, Role } from "./types";

const BRANCH = process.env.SIMPLIFY_BRANCH ?? "dev";
const LISTINGS_PATH = ".github/scripts/listings.json";
const README_PATH = "README.md";
const USER_AGENT = "internship-radar (+https://github.com/kalk-ak/internship-radar)";

export function rawUrl(repo: string, path: string) {
  return `https://raw.githubusercontent.com/${repo}/${BRANCH}/${path}`;
}

export function repoUrl(repo: string) {
  return `https://github.com/${repo}`;
}

/**
 * SimplifyJobs starts a new `SummerYYYY-Internships` repo every recruiting
 * season. Pick the newest one that exists unless SIMPLIFY_REPO pins it.
 */
export async function detectRepo(now = new Date()): Promise<string> {
  if (process.env.SIMPLIFY_REPO) return process.env.SIMPLIFY_REPO;
  const year = now.getUTCFullYear();
  for (const y of [year + 2, year + 1, year]) {
    const repo = `${SIMPLIFY_OWNER}/Summer${y}-Internships`;
    const res = await fetch(rawUrl(repo, LISTINGS_PATH), {
      method: "HEAD",
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return repo;
  }
  return `${SIMPLIFY_OWNER}/Summer${year + 1}-Internships`;
}

export type ConditionalResult<T> =
  | { changed: false; etag?: string }
  | { changed: true; etag?: string; body: T };

async function conditionalGet(url: string, etag: string | undefined): Promise<ConditionalResult<Response>> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (etag) headers["If-None-Match"] = etag;
  const res = await fetch(url, { cache: "no-store", headers, signal: AbortSignal.timeout(45_000) });
  if (res.status === 304) return { changed: false, etag };
  if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
  return { changed: true, etag: res.headers.get("etag") ?? undefined, body: res };
}

/** Checks whether the README markdown changed (cheap: 304 when unchanged). */
export async function checkReadme(repo: string, etag?: string) {
  const res = await conditionalGet(rawUrl(repo, README_PATH), etag);
  // Drain the body: cancelling the stream can stall under Next's patched fetch.
  if (res.changed) await res.body.arrayBuffer();
  return { changed: res.changed, etag: res.etag };
}

/** Fetches the structured data the README is generated from. */
export async function fetchListings(repo: string, etag?: string): Promise<ConditionalResult<RawListing[]>> {
  const res = await conditionalGet(rawUrl(repo, LISTINGS_PATH), etag);
  if (!res.changed) return res;
  const body = (await res.body.json()) as RawListing[];
  if (!Array.isArray(body)) throw new Error("listings.json is not an array");
  return { changed: true, etag: res.etag, body };
}

const CATEGORY_MAP: Record<string, Category> = {
  software: "Software",
  "software engineering": "Software",
  "ai/ml/data": "AI/ML/Data",
  "data science, ai & machine learning": "AI/ML/Data",
  "data science": "AI/ML/Data",
  ai: "AI/ML/Data",
  "machine learning": "AI/ML/Data",
  quant: "Quant",
  "quantitative finance": "Quant",
  hardware: "Hardware",
  "hardware engineering": "Hardware",
  product: "Product",
  "product management": "Product",
};

export function normalizeCategory(raw: string | undefined): Category {
  return CATEGORY_MAP[(raw ?? "").trim().toLowerCase()] ?? "Software";
}

const SWE_TITLE =
  /\b(software|swe|sde|developer|full[\s-]?stack|back[\s-]?end|front[\s-]?end|mobile|ios|android|devops|site reliability|sre|platform engineer|infrastructure engineer)\b/i;

export function isSweTitle(title: string) {
  return SWE_TITLE.test(title);
}

export function toRole(l: RawListing, isHot: (company: string) => boolean): Role {
  const category = normalizeCategory(l.category);
  return {
    id: l.id,
    company: l.company_name.trim(),
    title: l.title.trim(),
    url: l.url,
    locations: l.locations ?? [],
    terms: (l.terms ?? []).filter((t) => t && t !== "N/A"),
    category,
    sponsorship: l.sponsorship ?? "Other",
    postedAt: l.date_posted * 1000,
    hot: isHot(l.company_name),
    swe: category === "Software" || isSweTitle(l.title),
  };
}

export function hotMatcher(extraHot: string[] = []) {
  return makeCompanyMatcher([...DEFAULT_HOT_COMPANIES, ...extraHot]);
}

export function openRoles(listings: RawListing[], isHot: (company: string) => boolean): Role[] {
  return listings.filter((l) => l.active && l.is_visible && l.id && l.url).map((l) => toRole(l, isHot));
}
