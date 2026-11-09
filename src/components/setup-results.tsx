import type { SetupReport } from "@/lib/subscribers";

const CHANNEL_NAMES: Record<string, string> = { email: "Email", telegram: "Telegram", discord: "Discord", whatsapp: "WhatsApp" };

const TONE = {
  verified: { mark: "Connected", cls: "bg-ok-wash text-ok" },
  pending: { mark: "Next step", cls: "bg-wash text-ink-soft" },
  failed: { mark: "Needs a fix", cls: "bg-bad-wash text-bad" },
};

export function SetupResults({ reports, telegramUrl }: { reports: SetupReport[]; telegramUrl?: string | null }) {
  if (!reports.length && !telegramUrl) return null;
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.channel} className="flex flex-col gap-1 rounded-lg border border-rule bg-panel px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <span className="w-24 shrink-0 font-semibold">{CHANNEL_NAMES[r.channel] ?? r.channel}</span>
          <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[r.status].cls}`}>{TONE[r.status].mark}</span>
          <span className="text-sm text-ink-soft">{r.message}</span>
          {r.channel === "telegram" && telegramUrl && (
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="w-fit rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper sm:ml-auto">
              Open Telegram
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
