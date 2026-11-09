"use client";

import { useState, type ReactNode } from "react";
import { CATEGORIES, type Category, type Prefs } from "@/lib/types";

export interface ChannelConfig {
  emailReady: boolean;
  telegramReady: boolean;
  whatsappCloud: boolean;
  instagramHandle?: string;
}

export interface FieldDefaults {
  name?: string;
  email?: string;
  telegram?: boolean;
  discordWebhook?: string;
  whatsappPhone?: string;
  hasCallmebotKey?: boolean;
  prefs?: Prefs;
}

const CATEGORY_TEXT: Record<Category, string> = {
  Software: "Software engineering",
  "AI/ML/Data": "AI, ML and data science",
  Quant: "Quant and trading",
  Hardware: "Hardware and embedded",
  Product: "Product management",
};

const inputClass =
  "w-full rounded-lg border border-rule-strong bg-paper px-3.5 py-2.5 text-[0.95rem] text-ink focus:border-accent focus:outline-none";

function Icon({ name }: { name: "email" | "telegram" | "discord" | "whatsapp" }) {
  const paths = {
    email: <path d="M3 6.5 12 13l9-6.5M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
    telegram: <path d="m21 4-18 7.2 6 2.3M21 4l-3.2 16-8.3-6.5M21 4 9.5 13.5v5.5l3-3.4" />,
    discord: <path d="M8 15.5c2.6 1.2 5.4 1.2 8 0M9 11.5h.01M15 11.5h.01M7.5 6.5C9 5.8 10.5 5.5 12 5.5s3 .3 4.5 1c1.6 2.3 2.6 5 2.9 8.3-1.3 1.1-2.7 1.9-4.2 2.4l-1-1.7M7.5 6.5C5.9 8.8 4.9 11.5 4.6 14.8c1.3 1.1 2.7 1.9 4.2 2.4l1-1.7" />,
    whatsapp: <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20Zm5-11.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2.1-1-1 .9a5 5 0 0 1-2.7-2.7l.9-1-1-2.1L9 8.5Z" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function ChannelRow({
  id,
  icon,
  title,
  hint,
  defaultOn,
  status,
  children,
}: {
  id: string;
  icon: "email" | "telegram" | "discord" | "whatsapp";
  title: string;
  hint: string;
  defaultOn: boolean;
  status?: ReactNode;
  children?: ReactNode;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className={`rounded-xl border transition-colors ${on ? "border-accent/50 bg-wash" : "border-rule bg-paper/40 hover:border-rule-strong"}`}>
      <label className="flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          name={`use_${id}`}
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name={icon} />
            {title}
            {status}
          </span>
          <span className="text-sm text-muted">{hint}</span>
        </span>
      </label>
      {on && children && <div className="space-y-3 px-4 pb-4 pl-12">{children}</div>}
    </div>
  );
}

export function StatusChip({ verified, pendingText = "Waiting for confirmation" }: { verified: boolean; pendingText?: string }) {
  return verified ? (
    <span className="rounded-full bg-ok-wash px-2 py-0.5 text-xs font-semibold text-ok">Connected</span>
  ) : (
    <span className="rounded-full bg-hot-wash px-2 py-0.5 text-xs font-semibold text-hot-text">{pendingText}</span>
  );
}

export function SubscriptionFields({
  config,
  defaults = {},
  statuses,
  showName = true,
}: {
  config: ChannelConfig;
  defaults?: FieldDefaults;
  statuses?: Partial<Record<"email" | "telegram" | "discord" | "whatsapp", boolean>>;
  showName?: boolean;
}) {
  const prefs = defaults.prefs ?? { categories: ["Software"], hotOnly: true, watch: [] };
  const chip = (k: keyof NonNullable<typeof statuses>) =>
    statuses && statuses[k] !== undefined ? <StatusChip verified={Boolean(statuses[k])} /> : null;

  return (
    <div className="space-y-8">
      {showName && (
        <div>
          <label htmlFor="name" className="mb-1.5 block font-semibold">
            Your name
          </label>
          <input id="name" name="name" required maxLength={60} defaultValue={defaults.name} autoComplete="given-name" className={inputClass} placeholder="Alex" />
        </div>
      )}

      <fieldset>
        <legend className="mb-1 font-semibold">Where should alerts go?</legend>
        <p className="mb-3 text-sm text-muted">Pick one or more. Each one gets every alert.</p>
        <div className="space-y-2.5">
          <ChannelRow
            id="email"
            icon="email"
            title="Email"
            hint={config.emailReady ? "We'll send a confirmation link first." : "Saved now, confirmed once email sending is switched on."}
            defaultOn={Boolean(defaults.email) || !statuses}
            status={chip("email")}
          >
            <input name="email" type="email" defaultValue={defaults.email} autoComplete="email" placeholder="you@school.edu" aria-label="Email address" className={inputClass} />
          </ChannelRow>

          <ChannelRow
            id="telegram"
            icon="telegram"
            title="Telegram"
            hint={config.telegramReady ? "After saving, open our bot and press Start." : "Our Telegram bot isn't switched on yet. Saving now connects you later."}
            defaultOn={Boolean(defaults.telegram)}
            status={chip("telegram")}
          />

          <ChannelRow
            id="discord"
            icon="discord"
            title="Discord"
            hint="Post alerts into a channel on your server, or your study group's."
            defaultOn={Boolean(defaults.discordWebhook)}
            status={chip("discord")}
          >
            <input name="discordWebhook" type="url" defaultValue={defaults.discordWebhook} placeholder="https://discord.com/api/webhooks/…" aria-label="Discord webhook URL" className={inputClass} />
            <p className="text-sm text-muted">
              In Discord: channel settings, Integrations, Webhooks, New Webhook, then Copy Webhook URL. We&apos;ll post a test message.
            </p>
          </ChannelRow>

          <ChannelRow
            id="whatsapp"
            icon="whatsapp"
            title="WhatsApp"
            hint={config.whatsappCloud ? "We'll send a test message to confirm." : "Uses the free CallMeBot service. You'll need a key, which takes a minute to get."}
            defaultOn={Boolean(defaults.whatsappPhone)}
            status={chip("whatsapp")}
          >
            <input name="whatsappPhone" type="tel" defaultValue={defaults.whatsappPhone} placeholder="+1 415 555 0123" autoComplete="tel" aria-label="WhatsApp number with country code" className={inputClass} />
            {!config.whatsappCloud && (
              <>
                <input
                  name="callmebotKey"
                  inputMode="numeric"
                  placeholder={defaults.hasCallmebotKey ? "Key saved. Paste a new one to replace it" : "CallMeBot API key"}
                  aria-label="CallMeBot API key"
                  className={inputClass}
                />
                <p className="text-sm text-muted">
                  Get your key by following step 1 on{" "}
                  <a className="font-medium text-ink underline underline-offset-2" href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer">
                    CallMeBot&apos;s WhatsApp page
                  </a>
                  . They reply with your key on WhatsApp.
                </p>
              </>
            )}
          </ChannelRow>
        </div>
        {config.instagramHandle && (
          <p className="mt-3 text-sm text-muted">
            On Instagram? Follow{" "}
            <a href={`https://instagram.com/${config.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-2">
              @{config.instagramHandle}
            </a>
            . Every hot SWE drop gets posted there.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-semibold">What should we alert you about?</legend>
        <p className="mb-3 text-sm text-muted">Software includes roles with software titles in other categories, like ML infrastructure.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-rule bg-paper/40 px-3.5 py-2.5 text-[0.95rem] has-[:checked]:border-accent/50 has-[:checked]:bg-wash">
              <input type="checkbox" name="categories" value={c} defaultChecked={prefs.categories.includes(c)} className="h-4 w-4 accent-[var(--color-accent)]" />
              {CATEGORY_TEXT[c]}
            </label>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-rule bg-panel px-3.5 py-3 has-[:checked]:border-accent/50 has-[:checked]:bg-wash">
          <input type="checkbox" name="hotOnly" defaultChecked={prefs.hotOnly} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
          <span>
            <span className="font-semibold">Only top companies</span>
            <span className="block text-sm text-muted">
              FAANG+, top quant firms and AI labs, about 100 companies. Untick to hear about every new matching role, which can be dozens a day.
            </span>
          </span>
        </label>
        <div className="mt-4">
          <label htmlFor="watch" className="mb-1.5 block text-[0.95rem] font-medium">
            Always alert me about these companies too <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="watch" name="watch" defaultValue={prefs.watch.join(", ")} placeholder="Capital One, Duolingo, Jane Street" className={inputClass} />
        </div>
      </fieldset>
    </div>
  );
}
