import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AddSubscriberForm, Field, LoginForm, SettingsForm } from "@/components/admin-forms";
import { ActionButton } from "@/components/manage-panel";
import { Wordmark } from "@/components/site-chrome";
import { StatusChip } from "@/components/subscription-fields";
import { TimeAgo } from "@/components/time-ago";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { getRuns, getState } from "@/lib/checker";
import { DEFAULT_HOT_COMPANIES } from "@/lib/companies";
import { appUrl } from "@/lib/env";
import { kv, redisCredentials } from "@/lib/kv";
import { DELIVERIES } from "@/lib/notify";
import { publicChannelConfig } from "@/lib/public-config";
import { channelStatus, envLocked, getSettings } from "@/lib/settings";
import { repoUrl } from "@/lib/simplify";
import { listSubscribers, manageUrl } from "@/lib/subscribers";
import type { DeliveryLog } from "@/lib/types";
import {
  adminAddSubscriberAction,
  adminSubscriberAction,
  loginAction,
  logoutAction,
  runCheckAction,
  saveChannelSettingsAction,
  saveCompaniesAction,
} from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const maxDuration = 60;

const SECTIONS = [
  ["status", "Status"],
  ["channels", "Channels"],
  ["subscribers", "Subscribers"],
  ["activity", "Activity"],
  ["companies", "Companies"],
] as const;

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-rule py-10">
      <h2 className="font-head text-2xl font-bold">{title}</h2>
      {intro && <div className="mt-1 max-w-3xl text-sm text-muted">{intro}</div>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Panel({ title, ready, children }: { title: string; ready: boolean; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-rule bg-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <StatusChip verified={ready} pendingText="Not set up" />
      </div>
      {children}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-rule bg-panel px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}

async function Dashboard() {
  const [state, runs, deliveries, subs, settings, config] = await Promise.all([
    getState(),
    getRuns(30),
    kv().lrange<DeliveryLog>(DELIVERIES, 0, 49),
    listSubscribers(),
    getSettings(),
    publicChannelConfig(),
  ]);
  const ready = channelStatus(settings);
  const saved = (v?: string) => (v ? "Saved. Leave blank to keep it" : undefined);
  const channelCounts = {
    email: subs.filter((s) => s.channels.email?.verified).length,
    telegram: subs.filter((s) => s.channels.telegram?.verified).length,
    discord: subs.filter((s) => s.channels.discord?.verified).length,
    whatsapp: subs.filter((s) => s.channels.whatsapp?.verified).length,
  };

  return (
    <>
      {!redisCredentials() && (
        <p role="alert" className="mb-6 rounded-xl bg-bad-wash px-4 py-3 text-sm font-medium text-bad">
          No Redis database is connected, so data lives in memory and is lost on every cold start. Connect Upstash Redis from
          the Vercel dashboard (Storage tab), then redeploy.
        </p>
      )}

      <Section id="status" title="Status" intro="The checker runs every 5 minutes from GitHub Actions, with Vercel's own scheduler as a 15-minute backup.">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Watching">
            {state.repo ? (
              <a className="underline underline-offset-2" href={repoUrl(state.repo)}>
                {state.repo}
              </a>
            ) : (
              "Not yet detected"
            )}
          </Fact>
          <Fact label="Last check">{state.lastRunAt ? <TimeAgo at={state.lastRunAt} colored={false} /> : "Never"}</Fact>
          <Fact label="Listings last changed">{state.lastChangeAt ? <TimeAgo at={state.lastChangeAt} colored={false} /> : "Not yet"}</Fact>
          <Fact label="README last changed">{state.lastReadmeChangeAt ? <TimeAgo at={state.lastReadmeChangeAt} colored={false} /> : "Not yet"}</Fact>
          <Fact label="Checks run">{(state.runs ?? 0).toLocaleString()}</Fact>
          <Fact label="Last error">
            {state.lastError ? (
              <span className="text-bad">
                {state.lastError} {state.lastErrorAt && <TimeAgo at={state.lastErrorAt} colored={false} className="font-normal text-muted" />}
              </span>
            ) : (
              <span className="text-ok">None</span>
            )}
          </Fact>
        </dl>
        <div className="mt-5 max-w-xs">
          <ActionButton action={runCheckAction}>Run a check now</ActionButton>
        </div>
      </Section>

      <Section
        id="channels"
        title="Channels"
        intro="Credentials are stored encrypted in Redis. Environment variables override them. Discord needs nothing here: subscribers paste their own webhook."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Email (Gmail)" ready={ready.email}>
            <p className="mb-3 text-sm text-muted">
              Turn on 2-Step Verification for the Gmail account, then create an app password at{" "}
              <a className="underline" href="https://myaccount.google.com/apppasswords">
                myaccount.google.com/apppasswords
              </a>
              . Gmail allows about 500 emails a day.
            </p>
            <SettingsForm action={saveChannelSettingsAction.bind(null, "email")} removable={ready.email}>
              <Field label="Gmail address" name="emailUser" type="email" defaultValue={settings.emailUser} locked={envLocked("emailUser")} />
              <Field label="App password" name="emailPassword" type="password" placeholder={saved(settings.emailPassword) ?? "16 characters"} locked={envLocked("emailPassword")} />
              <details className="text-sm">
                <summary className="cursor-pointer text-muted">Use a different SMTP provider</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="SMTP host" name="smtpHost" placeholder="smtp.gmail.com" defaultValue={settings.smtpHost} />
                  <Field label="SMTP port" name="smtpPort" placeholder="465" defaultValue={settings.smtpPort} />
                  <Field label="From header" name="emailFrom" placeholder="Internship Radar <you@gmail.com>" defaultValue={settings.emailFrom} />
                </div>
              </details>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="subscribeSelf" defaultChecked={!ready.email} className="accent-[var(--color-accent)]" />
                Also subscribe this address to hot SWE alerts
              </label>
            </SettingsForm>
          </Panel>

          <Panel title={settings.telegramBotUsername ? `Telegram (@${settings.telegramBotUsername})` : "Telegram"} ready={ready.telegram}>
            <p className="mb-3 text-sm text-muted">
              Message <a className="underline" href="https://t.me/BotFather">@BotFather</a>, send <code>/newbot</code>, and paste
              the token. Saving registers the webhook at <code className="break-all">{appUrl()}/api/telegram/webhook</code>.
            </p>
            <SettingsForm action={saveChannelSettingsAction.bind(null, "telegram")} submitLabel={ready.telegram ? "Reconnect" : "Connect bot"} removable={ready.telegram}>
              <Field label="Bot token" name="telegramBotToken" type="password" placeholder={saved(settings.telegramBotToken) ?? "123456:ABC-DEF…"} locked={envLocked("telegramBotToken")} />
            </SettingsForm>
          </Panel>

          <Panel title="WhatsApp (Meta Cloud API)" ready={ready.whatsappCloud}>
            <p className="mb-3 text-sm text-muted">
              Optional. Without it, subscribers use the free CallMeBot service with their own key. With it, messages come from
              your WhatsApp Business number. The free test number reaches up to 5 verified phones. Outside a 24-hour chat
              window Meta requires an approved template, such as <code>internship_alert</code> with 3 body variables:
              headline, roles and link. See the README.
            </p>
            <SettingsForm action={saveChannelSettingsAction.bind(null, "whatsapp")} removable={ready.whatsappCloud}>
              <Field label="Access token" name="whatsappToken" type="password" placeholder={saved(settings.whatsappToken)} locked={envLocked("whatsappToken")} />
              <Field label="Phone number ID" name="whatsappPhoneNumberId" defaultValue={settings.whatsappPhoneNumberId} locked={envLocked("whatsappPhoneNumberId")} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Template name" name="whatsappTemplate" placeholder="internship_alert" defaultValue={settings.whatsappTemplate} locked={envLocked("whatsappTemplate")} />
                <Field label="Template language" name="whatsappTemplateLang" placeholder="en_US" defaultValue={settings.whatsappTemplateLang} locked={envLocked("whatsappTemplateLang")} />
              </div>
            </SettingsForm>
          </Panel>

          <Panel title={settings.instagramUsername ? `Instagram (@${settings.instagramUsername})` : "Instagram"} ready={ready.instagram}>
            <p className="mb-3 text-sm text-muted">
              Instagram doesn&apos;t let bots DM people first, so hot SWE drops are posted as image cards on your Business or
              Creator account instead. Create a Meta app with the Instagram API product, generate a long-lived token, and
              paste it here. It refreshes automatically.
            </p>
            <SettingsForm action={saveChannelSettingsAction.bind(null, "instagram")} submitLabel={ready.instagram ? "Reconnect" : "Connect account"} removable={ready.instagram}>
              <Field label="Long-lived access token" name="instagramToken" type="password" placeholder={saved(settings.instagramToken) ?? "IGAA…"} />
            </SettingsForm>
          </Panel>
        </div>
      </Section>

      <Section
        id="subscribers"
        title="Subscribers"
        intro={`${subs.length} total. Confirmed channels: ${channelCounts.email} email, ${channelCounts.telegram} Telegram, ${channelCounts.discord} Discord, ${channelCounts.whatsapp} WhatsApp.`}
      >
        <details className="mb-6 rounded-xl border border-rule bg-panel p-5">
          <summary className="cursor-pointer font-semibold">Add a subscriber</summary>
          <div className="mt-5">
            <AddSubscriberForm action={adminAddSubscriberAction} config={config} />
          </div>
        </details>
        {subs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-rule-strong px-5 py-8 text-center text-ink-soft">
            Nobody yet. Share {appUrl()} or add someone above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-rule bg-panel">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="border-b border-rule text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Channels</th>
                  <th className="px-4 py-3 font-medium">Wants</th>
                  <th className="px-4 py-3 font-medium">Alerts</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {subs.map((s) => (
                  <tr key={s.id} className={s.paused ? "text-muted" : ""}>
                    <td className="px-4 py-3 font-semibold">
                      {s.name}
                      {s.paused && <span className="ml-2 font-normal">(paused)</span>}
                      {s.channels.email && <div className="font-normal text-muted">{s.channels.email.address}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(s.channels).map(([name, ch]) => (
                          <span key={name} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ch?.verified ? "bg-ok-wash text-ok" : "bg-hot-wash text-hot-text"}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.prefs.categories.join(", ")}
                      {s.prefs.hotOnly ? ", top companies" : ", any company"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.alertsSent}</td>
                    <td className="px-4 py-3">
                      <TimeAgo at={s.createdAt} colored={false} />
                    </td>
                    <td className="px-4 py-3">
                      <details className="relative">
                        <summary className="cursor-pointer text-sm font-semibold">Actions</summary>
                        <div className="absolute right-0 z-20 mt-2 w-60 space-y-2 rounded-xl border border-rule bg-panel p-3 shadow-lg">
                          <ActionButton action={adminSubscriberAction.bind(null, s.id, "test")}>Send test alert</ActionButton>
                          <ActionButton action={adminSubscriberAction.bind(null, s.id, "pause")}>{s.paused ? "Resume" : "Pause"}</ActionButton>
                          <a href={manageUrl(s)} className="block rounded-lg border border-rule-strong px-4 py-2.5 text-sm font-semibold hover:border-ink-soft">
                            Open their manage page
                          </a>
                          <ActionButton action={adminSubscriberAction.bind(null, s.id, "delete")} confirm={`Remove ${s.name}?`} tone="danger">
                            Remove
                          </ActionButton>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="activity" title="Activity" intro="Quiet checks with no changes are only logged every hour.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold">Deliveries</h3>
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted">No alerts sent yet.</p>
            ) : (
              <ul className="divide-y divide-rule rounded-xl border border-rule bg-panel text-sm">
                {deliveries.map((d, i) => (
                  <li key={i} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">
                        {d.subscriberName} <span className="font-normal text-muted">via {d.channel}</span>
                      </span>
                      <span className={d.ok ? "text-ok" : "text-bad"}>{d.ok ? "Sent" : "Failed"}</span>
                    </div>
                    <div className="text-muted">
                      <TimeAgo at={d.at} colored={false} />, {d.headline}
                    </div>
                    {!d.ok && d.detail && <div className="mt-1 break-words text-xs text-bad">{d.detail}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Checks</h3>
            {runs.length === 0 ? (
              <p className="text-sm text-muted">No checks logged yet.</p>
            ) : (
              <ul className="divide-y divide-rule rounded-xl border border-rule bg-panel text-sm">
                {runs.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <span>
                      <TimeAgo at={r.at} colored={false} className="font-semibold" /> <span className="text-muted">by {r.trigger}</span>
                      <span className="block text-muted">
                        {r.error
                          ? `Error: ${r.error}`
                          : r.baseline
                            ? "Baseline saved"
                            : r.changed
                              ? `${r.newRoles} new, ${r.newHot} hot, ${r.alerts} alerted${r.failures ? `, ${r.failures} failed` : ""}`
                              : "No change"}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted">{(r.durationMs / 1000).toFixed(1)}s</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section id="companies" title="Top companies" intro="Roles at these companies are marked hot. The built-in list covers FAANG+ companies plus top quant firms and AI labs.">
        <SettingsForm action={saveCompaniesAction} submitLabel="Save companies">
          <label htmlFor="extraHotCompanies" className="block text-sm font-semibold">
            Extra companies, one per line or comma separated
          </label>
          <textarea
            id="extraHotCompanies"
            name="extraHotCompanies"
            rows={4}
            defaultValue={(settings.extraHotCompanies ?? []).join("\n")}
            placeholder={"Capital One\nIntuit"}
            className="w-full max-w-xl rounded-lg border border-rule bg-panel px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </SettingsForm>
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-muted">Built-in list ({DEFAULT_HOT_COMPANIES.length})</summary>
          <p className="mt-2 max-w-3xl leading-relaxed text-ink-soft">{DEFAULT_HOT_COMPANIES.join(", ")}</p>
        </details>
      </Section>
    </>
  );
}

async function Gate() {
  await connection();
  if (!adminConfigured()) {
    return <p className="rounded-xl bg-bad-wash px-4 py-3 font-medium text-bad">Set the ADMIN_PASSWORD environment variable to use the dashboard.</p>;
  }
  if (!(await isAdmin())) {
    return (
      <div className="py-10">
        <h1 className="mb-6 font-head text-3xl font-bold">Admin sign in</h1>
        <LoginForm action={loginAction} />
      </div>
    );
  }
  return (
    <>
      <nav className="sticky top-0 z-30 -mx-4 mb-2 flex items-center gap-1 overflow-x-auto bg-paper/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-wash">
            {label}
          </a>
        ))}
        <form action={logoutAction} className="ml-auto">
          <button className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-wash">Sign out</button>
        </form>
      </nav>
      <Dashboard />
    </>
  );
}

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Wordmark />
        <span className="text-sm font-semibold text-muted">Admin</span>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-wash motion-reduce:animate-none" />}>
        <Gate />
      </Suspense>
    </div>
  );
}
