import { groupByCompany } from "./match";
import type { Alert, Role } from "./types";

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function locationLabel(role: Role) {
  if (role.locations.length === 0) return "Location TBD";
  if (role.locations.length === 1) return role.locations[0];
  return `${role.locations[0]} +${role.locations.length - 1}`;
}

export function termLabel(role: Role) {
  return role.terms.length ? role.terms.join(", ") : "";
}

function sponsorshipNote(role: Role) {
  if (role.sponsorship === "Does Not Offer Sponsorship") return "no sponsorship";
  if (role.sponsorship === "U.S. Citizenship is Required") return "US citizens only";
  return "";
}

function details(role: Role) {
  return [locationLabel(role), termLabel(role), sponsorshipNote(role)].filter(Boolean).join(" · ");
}

function limitRoles(alert: Alert, max: number) {
  return { shown: alert.roles.slice(0, max), hidden: Math.max(0, alert.roles.length - max) };
}

/** Plain text (WhatsApp / SMS-like channels). */
export function plainText(alert: Alert, links: { manage?: string; board: string }, max = 8) {
  const { shown, hidden } = limitRoles(alert, max);
  const lines = [`*${alert.headline}*`, ""];
  for (const [company, roles] of groupByCompany(shown)) {
    lines.push(`${roles[0].hot ? "🔥 " : ""}${company}`);
    for (const r of roles) lines.push(`• ${r.title} (${details(r)})`, `  ${r.url}`);
    lines.push("");
  }
  if (hidden) lines.push(`+${hidden} more on ${links.board}`, "");
  if (links.manage) lines.push(`Manage alerts: ${links.manage}`);
  return lines.join("\n").trim();
}

/** Telegram HTML parse mode, capped below the 4096 char message limit. */
export function telegramHtml(alert: Alert, links: { manage?: string; board: string }) {
  let max = 15;
  for (;;) {
    const { shown, hidden } = limitRoles(alert, max);
    const parts = [`<b>${escapeHtml(alert.headline)}</b>`, ""];
    for (const [company, roles] of groupByCompany(shown)) {
      parts.push(`<b>${roles[0].hot ? "🔥 " : ""}${escapeHtml(company)}</b>`);
      for (const r of roles) {
        parts.push(`• <a href="${escapeHtml(r.url)}">${escapeHtml(r.title)}</a>\n   <i>${escapeHtml(details(r))}</i>`);
      }
      parts.push("");
    }
    if (hidden) parts.push(`<a href="${escapeHtml(links.board)}">+${hidden} more roles</a>`);
    if (links.manage) parts.push(`<a href="${escapeHtml(links.manage)}">Manage alerts</a> · /stop to unsubscribe`);
    const text = parts.join("\n").trim();
    if (text.length < 4000 || max <= 3) return text;
    max -= 3;
  }
}

/** Discord webhook payload with one embed per company (max 10 embeds). */
export function discordPayload(alert: Alert, links: { manage?: string; board: string }) {
  const groups = [...groupByCompany(alert.roles).entries()];
  const embeds = groups.slice(0, 9).map(([company, roles]) => ({
    title: `${roles[0].hot ? "🔥 " : ""}${company}`.slice(0, 256),
    color: roles[0].hot ? 0xff5a1f : 0x5865f2,
    fields: roles.slice(0, 20).map((r) => ({
      name: r.title.slice(0, 256),
      value: `${details(r)}\n[Apply →](${r.url})`.slice(0, 1024),
    })),
    timestamp: new Date(roles[0].postedAt).toISOString(),
  }));
  const extra = groups.length - embeds.length;
  const footer = [extra > 0 ? `+${extra} more companies on the board` : "", links.manage ? `[Manage alerts](${links.manage})` : ""]
    .filter(Boolean)
    .join(" · ");
  return {
    username: "Internship Radar",
    content: `**${alert.headline}**${footer ? `\n${footer}` : ""}`.slice(0, 2000),
    embeds,
    allowed_mentions: { parse: [] },
  };
}

/** Email subject + HTML + text bodies. Inline styles only (email clients). */
export function emailContent(alert: Alert, links: { manage?: string; board: string }) {
  const { shown, hidden } = limitRoles(alert, 40);
  const sections = [...groupByCompany(shown).entries()]
    .map(([company, roles]) => {
      const rows = roles
        .map(
          (r) => `
        <tr>
          <td style="padding:12px 0;border-top:1px solid #ece7df;">
            <div style="font-size:15px;font-weight:600;color:#1b1813;">${escapeHtml(r.title)}</div>
            <div style="font-size:13px;color:#6b6358;margin-top:2px;">${escapeHtml(details(r))}</div>
          </td>
          <td style="padding:12px 0 12px 12px;border-top:1px solid #ece7df;text-align:right;white-space:nowrap;">
            <a href="${escapeHtml(r.url)}" style="display:inline-block;background:#1b1813;color:#fff8ef;text-decoration:none;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;">Apply</a>
          </td>
        </tr>`,
        )
        .join("");
      return `
      <div style="margin:0 0 20px;padding:18px 20px;background:#ffffff;border:1px solid #ece7df;border-radius:14px;">
        <div style="font-size:18px;font-weight:700;color:#1b1813;margin-bottom:4px;">${roles[0].hot ? "🔥 " : ""}${escapeHtml(company)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      </div>`;
    })
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
    <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#c2410c;font-weight:700;">Internship Radar</div>
    <h1 style="font-size:24px;line-height:1.25;color:#1b1813;margin:8px 0 20px;">${escapeHtml(alert.headline)}</h1>
    ${sections}
    ${hidden ? `<p style="font-size:14px;color:#1b1813;"><a href="${escapeHtml(links.board)}" style="color:#c2410c;">See ${hidden} more roles on the board →</a></p>` : ""}
    <p style="font-size:12px;color:#8a8175;margin-top:28px;line-height:1.6;">
      ${links.manage ? `<a href="${escapeHtml(links.manage)}" style="color:#8a8175;">Manage your alerts or unsubscribe</a>` : ""}
    </p>
  </div>
</body></html>`;

  return { subject: alert.headline, html, text: plainText(alert, links, 40) };
}

/** Single-line parameter values for WhatsApp templates (no newlines allowed). */
export function templateParams(alert: Alert, board: string): string[] {
  const summary = alert.roles
    .slice(0, 5)
    .map((r) => `${r.company}: ${r.title} (${locationLabel(r)})`)
    .join(" | ");
  const more = alert.roles.length > 5 ? ` | +${alert.roles.length - 5} more` : "";
  return [alert.headline, (summary + more).slice(0, 900), alert.roles.length === 1 ? alert.roles[0].url : board];
}

/** Instagram caption (links are not clickable on IG, so keep it scannable). */
export function instagramCaption(company: string, roles: Role[], board: string) {
  const lines = [
    `🔥 ${company} just opened ${roles.length} internship role${roles.length === 1 ? "" : "s"}`,
    "",
    ...roles.slice(0, 10).map((r) => `• ${r.title} — ${details(r)}`),
    "",
    `Apply fast. Full list + free alerts: ${board.replace(/^https?:\/\//, "")}`,
    "",
    "#internship #swe #softwareengineering #techinternships #cscareers #summerinternship",
  ];
  return lines.join("\n").slice(0, 2100);
}
