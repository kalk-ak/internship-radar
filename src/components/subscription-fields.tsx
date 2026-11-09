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
  "AI/ML/Data": "AI, machine learning and data",
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

  // Numbered steps only when the name field is shown (signup); manage pages reuse the same fields.
  const step = (n: number, text: string) => (
    <span className="flex items-center gap-3">
      {showName && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-hot-wash text-xs font-bold text-accent" aria-hidden>
          {n}
        </span>
      )}
      {text}
    </span>
  );

  return (
    <div className="space-y-9">
      {showName && (
        <div>
          <label htmlFor="name" className="mb-2 block font-semibold text-ink">
            {step(1, "What should we call you?")}
          </label>
          <input id="name" name="name" required maxLength={60} defaultValue={defaults.name} autoComplete="given-name" className={inputClass} placeholder="Your first name" />
        </div>
      )}

      <fieldset>
        <legend className="mb-1 font-semibold text-ink">{step(2, "Where should we send alerts?")}</legend>
        <p className={`mb-3 text-sm text-muted ${showName ? "pl-9" : ""}`}>Pick one or more.</p>
        <div className="space-y-2.5">
          <ChannelRow
            id="email"
            icon="email"
            title="Email"
            hint={config.emailReady ? "We'll email you a link to confirm your address." : "We'll confirm your address once email alerts are switched on."}
            defaultOn={Boolean(defaults.email) || !statuses}
            status={chip("email")}
          >
            <input name="email" type="email" defaultValue={defaults.email} autoComplete="email" placeholder="you@school.edu" aria-label="Email address" className={inputClass} />
          </ChannelRow>

          <ChannelRow
            id="telegram"
            icon="telegram"
            title="Telegram"
            hint={config.telegramReady ? "After you save, tap the link to open our bot and press Start." : "Coming soon. Tick it now and we'll connect you once it's ready."}
            defaultOn={Boolean(defaults.telegram)}
            status={chip("telegram")}
          />

          <ChannelRow
            id="discord"
            icon="discord"
            title="Discord"
            hint="Send alerts to a channel in your Discord server."
            defaultOn={Boolean(defaults.discordWebhook)}
            status={chip("discord")}
          >
            <input name="discordWebhook" type="url" defaultValue={defaults.discordWebhook} placeholder="https://discord.com/api/webhooks/…" aria-label="Discord webhook URL" className={inputClass} />
            <p className="text-sm text-muted">
              To get this link: in Discord, open the channel&apos;s settings, choose Integrations, then Webhooks, then New Webhook, and
              click Copy Webhook URL.
            </p>
          </ChannelRow>

          <ChannelRow
            id="whatsapp"
            icon="whatsapp"
            title="WhatsApp"
            hint={config.whatsappCloud ? "We'll send a test message to confirm your number." : "Uses the free CallMeBot service, which needs a quick one-time setup."}
            defaultOn={Boolean(defaults.whatsappPhone)}
            status={chip("whatsapp")}
          >
            <input name="whatsappPhone" type="tel" defaultValue={defaults.whatsappPhone} placeholder="+1 415 555 0123" autoComplete="tel" aria-label="WhatsApp number with country code" className={inputClass} />
            {!config.whatsappCloud && (
              <>
                <input
                  name="callmebotKey"
                  inputMode="numeric"
                  placeholder={defaults.hasCallmebotKey ? "Key saved. Paste a new one to replace it" : "Your CallMeBot key"}
                  aria-label="CallMeBot key"
                  className={inputClass}
                />
                <p className="text-sm text-muted">
                  To get a free key, follow step 1 on{" "}
                  <a className="font-medium text-ink underline underline-offset-2" href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer">
                    this CallMeBot page
                  </a>
                  . They&apos;ll send the key to you on WhatsApp.
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
            </a>{" "}
            to see new roles in your feed.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-semibold text-ink">{step(showName ? 3 : 2, "What kind of roles?")}</legend>
        <p className={`mb-3 text-sm text-muted ${showName ? "pl-9" : ""}`}>Choose as many as you like.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-rule bg-paper/40 px-3.5 py-2.5 text-[0.95rem] has-[:checked]:border-accent/50 has-[:checked]:bg-wash">
              <input type="checkbox" name="categories" value={c} defaultChecked={prefs.categories.includes(c)} className="h-4 w-4 accent-[var(--color-accent)]" />
              {CATEGORY_TEXT[c]}
            </label>
          ))}
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-rule bg-paper/40 px-3.5 py-3 has-[:checked]:border-accent/50 has-[:checked]:bg-wash">
          <input type="checkbox" name="hotOnly" defaultChecked={prefs.hotOnly} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
          <span>
            <span className="font-semibold">Only top companies</span>
            <span className="block text-sm text-muted">Big tech, top trading firms and AI labs. Turn this off to hear about every new role, which can be dozens a day.</span>
          </span>
        </label>
        <details className="group mt-3 rounded-lg border border-rule bg-paper/40 px-3.5 py-3" open={prefs.watch.length > 0}>
          <summary className="cursor-pointer text-sm font-medium text-ink-soft marker:text-muted">More options</summary>
          <div className="mt-3">
            <label htmlFor="watch" className="mb-1.5 block text-sm text-ink-soft">
              Also alert me about these companies, even if they aren&apos;t on the top list
            </label>
            <input id="watch" name="watch" defaultValue={prefs.watch.join(", ")} placeholder="For example: Capital One, Duolingo" className={inputClass} />
          </div>
        </details>
      </fieldset>
    </div>
  );
}
