import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEYS, getFeed, runCheck } from "../src/lib/checker";
import { MemoryKV, setKV } from "../src/lib/kv";
import type { RawListing } from "../src/lib/types";

const now = Math.floor(Date.now() / 1000);
const listing = (id: string, company: string, ageSec = 60): RawListing => ({
  id,
  company_name: company,
  title: "Software Engineer Intern",
  url: `https://example.com/${id}`,
  locations: ["Remote"],
  terms: ["Summer 2027"],
  category: "Software",
  sponsorship: "Other",
  date_posted: now - ageSec,
  active: true,
  is_visible: true,
});

let listings: RawListing[] = [];
let etag = 1;

beforeEach(() => {
  setKV(new MemoryKV());
  process.env.SIMPLIFY_REPO = "SimplifyJobs/Summer2027-Internships";
  listings = [listing("a", "Google"), listing("b", "Acme")];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const ifNoneMatch = (init?.headers as Record<string, string> | undefined)?.["If-None-Match"];
      const tag = `"v${etag}"`;
      if (ifNoneMatch === tag) return new Response(null, { status: 304 });
      const body = url.endsWith("listings.json") ? JSON.stringify(listings) : "# README";
      return new Response(body, { status: 200, headers: { etag: tag } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runCheck", () => {
  it("baselines on the first run without alerting", async () => {
    const log = await runCheck("test");
    expect(log.baseline).toBe(true);
    expect(log.newRoles).toBe(0);
    expect((await getFeed()).map((r) => r.company)).toEqual(["Google"]);
  });

  it("skips work when nothing changed", async () => {
    await runCheck("test");
    const log = await runCheck("test");
    expect(log.changed).toBe(false);
  });

  it("detects new listings exactly once", async () => {
    await runCheck("test");
    listings.push(listing("c", "Stripe"), listing("d", "Small Co"));
    etag++;
    const first = await runCheck("test");
    expect(first.newRoles).toBe(2);
    expect(first.newHot).toBe(1);
    expect((await getFeed())[0].company).toBe("Stripe");

    etag++;
    const second = await runCheck("test", { force: true });
    expect(second.newRoles).toBe(0);
  });

  it("ignores old listings that appear late", async () => {
    await runCheck("test");
    listings.push(listing("old", "Google", 60 * 60 * 24 * 30));
    etag++;
    const log = await runCheck("test");
    expect(log.newRoles).toBe(0);
  });

  it("refuses to run concurrently", async () => {
    const { kv } = await import("../src/lib/kv");
    await kv().set(KEYS.lock, 1, { ex: 60 });
    const log = await runCheck("test");
    expect(log.skipped).toBeTruthy();
  });
});
