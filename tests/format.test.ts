import { describe, expect, it } from "vitest";
import { discordPayload, emailContent, telegramHtml, templateParams } from "../src/lib/format";
import { buildAlert } from "../src/lib/match";
import type { Role } from "../src/lib/types";

const roles: Role[] = Array.from({ length: 60 }, (_, i) => ({
  id: String(i),
  company: `Company ${i % 12} <script>`,
  title: `Software Engineer Intern ${"x".repeat(80)} ${i}`,
  url: `https://example.com/${i}?a=1&b=2`,
  locations: ["New York, NY", "Remote"],
  terms: ["Summer 2027"],
  category: "Software",
  sponsorship: "Does Not Offer Sponsorship",
  postedAt: Date.now(),
  hot: i % 2 === 0,
  swe: true,
}));
const alert = buildAlert(roles)!;
const links = { manage: "https://radar.example/manage/abc", board: "https://radar.example" };

describe("formatters", () => {
  it("keeps Telegram messages under the 4096 char limit and escapes HTML", () => {
    const html = telegramHtml(alert, links);
    expect(html.length).toBeLessThan(4096);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&amp;b=2");
  });

  it("respects Discord embed limits", () => {
    const payload = discordPayload(alert, links);
    expect(payload.embeds.length).toBeLessThanOrEqual(10);
    for (const e of payload.embeds) expect(e.fields.length).toBeLessThanOrEqual(25);
    expect(payload.content.length).toBeLessThanOrEqual(2000);
  });

  it("escapes email HTML", () => {
    const { html, subject } = emailContent(alert, links);
    expect(subject).toBe(alert.headline);
    expect(html).not.toContain("<script>");
  });

  it("produces single-line WhatsApp template params", () => {
    for (const p of templateParams(alert, links.board)) expect(p).not.toMatch(/[\n\t]/);
  });
});
