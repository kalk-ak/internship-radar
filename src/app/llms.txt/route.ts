import { appUrl } from "@/lib/env";
import { buildFaq, DEV_PAGE_DESCRIPTION, DEV_PAGE_PATH, formatDate, loadDevPageData, REPO_HTML_URL, topHiringCompanies } from "@/lib/seo";

/** https://llmstxt.org: a plain-markdown summary for LLMs and answer engines, with live numbers. */
export async function GET() {
  const data = await loadDevPageData();
  const url = appUrl();
  const top = topHiringCompanies(data.board, 10);
  const lines = [
    "# Internship Radar",
    "",
    `> ${DEV_PAGE_DESCRIPTION}`,
    "",
    "Internship Radar is free and MIT-licensed.",
    "",
  ];
  if (data.board) {
    lines.push(
      `## Live numbers (as of ${formatDate(data.board.updatedAt)})`,
      "",
      `- Open software engineering internships: ${(data.board.totals.byCategory.Software ?? 0).toLocaleString()}`,
      `- Open roles at top companies: ${data.board.totals.hot.toLocaleString()} across ${data.board.totals.hotCompanies} companies`,
      "",
    );
  }
  if (top.length) {
    lines.push("## Top companies hiring SWE interns (open roles posted in the last 45 days)", "", ...top.map((c) => `- ${c.company}: ${c.roles}`), "");
  }
  lines.push(
    "## Links",
    "",
    `- [Sign up for alerts](${url}/#alerts): email, Telegram, Discord or WhatsApp`,
    `- [Developer overview and FAQ](${url}${DEV_PAGE_PATH})`,
    `- [Open roles JSON API](${url}/api/roles?category=Software&hot=1): params category, hot, q, offset, limit`,
    `- [Source code](${REPO_HTML_URL})`,
    "",
    "## FAQ",
    "",
    ...buildFaq(data).flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
  );
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
  });
}
