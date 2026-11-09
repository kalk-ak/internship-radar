import {
  postInstagram,
  refreshInstagramToken,
  sendCallMeBot,
  sendDiscord,
  sendEmail,
  sendTelegram,
  sendWhatsAppCloud,
  type SendResult,
} from "./channels";
import { randomId } from "./crypto";
import { appUrl, DELIVERY_LOG_LIMIT } from "./env";
import { discordPayload, emailContent, instagramCaption, plainText, telegramHtml, templateParams } from "./format";
import { kv } from "./kv";
import { buildAlert, filterForPrefs, groupByCompany } from "./match";
import { channelStatus, saveSettings, type Settings } from "./settings";
import { hasVerifiedChannel, listSubscribers, manageUrl, saveSubscriber } from "./subscribers";
import type { Alert, ChannelName, DeliveryLog, Role, Subscriber } from "./types";

export const DELIVERIES = "log:deliveries";
const INSTAGRAM_POSTS_PER_RUN = 3;
const INSTAGRAM_POSTS_PER_DAY = 20;

function boardUrl() {
  return appUrl();
}

export async function deliver(sub: Subscriber, alert: Alert, settings: Settings): Promise<DeliveryLog[]> {
  const links = { manage: manageUrl(sub), board: boardUrl() };
  const jobs: [ChannelName, Promise<SendResult>][] = [];
  const { email, telegram, discord, whatsapp } = sub.channels;

  if (email?.verified) {
    const content = emailContent(alert, links);
    jobs.push(["email", sendEmail(settings, { to: email.address, ...content, unsubscribeUrl: links.manage })]);
  }
  if (telegram?.verified && telegram.chatId) {
    jobs.push(["telegram", sendTelegram(settings, telegram.chatId, telegramHtml(alert, links))]);
  }
  if (discord?.verified) {
    jobs.push(["discord", sendDiscord(discord.webhookUrl, discordPayload(alert, links))]);
  }
  if (whatsapp?.verified) {
    const text = plainText(alert, links);
    jobs.push([
      "whatsapp",
      channelStatus(settings).whatsappCloud
        ? sendWhatsAppCloud(settings, whatsapp.phone, text, templateParams(alert, links.board))
        : whatsapp.callmebotKey
          ? sendCallMeBot(whatsapp.phone, whatsapp.callmebotKey, text)
          : Promise.resolve({ ok: false, detail: "No CallMeBot key" } as SendResult),
    ]);
  }

  const results = await Promise.all(jobs.map(([, p]) => p));
  return jobs.map(([channel], i) => ({
    at: Date.now(),
    subscriberId: sub.id,
    subscriberName: sub.name,
    channel,
    ok: results[i].ok,
    detail: results[i].detail,
    headline: alert.headline,
  }));
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

/** Sends each subscriber the subset of `roles` that matches their preferences. */
export async function notifySubscribers(roles: Role[], settings: Settings) {
  const subs = (await listSubscribers()).filter((s) => !s.paused && hasVerifiedChannel(s));
  const logs: DeliveryLog[] = [];
  let alerted = 0;

  await inBatches(subs, 5, async (sub) => {
    const alert = buildAlert(filterForPrefs(roles, sub.prefs));
    if (!alert) return;
    const results = await deliver(sub, alert, settings);
    logs.push(...results);
    if (results.some((r) => r.ok)) {
      alerted++;
      sub.alertsSent += 1;
      sub.lastAlertAt = Date.now();
      await saveSubscriber(sub);
    }
  });

  logs.push(...(await broadcastInstagram(roles, settings)));
  await kv().lpush(DELIVERIES, logs, DELIVERY_LOG_LIMIT);
  return { alerted, deliveries: logs.length, failures: logs.filter((l) => !l.ok).length };
}

/* ------------------------------------------------------------- instagram */

export interface InstagramCard {
  company: string;
  roles: Role[];
}

export const cardKey = (id: string) => `igcard:${id}`;

export async function broadcastInstagram(roles: Role[], settings: Settings): Promise<DeliveryLog[]> {
  if (!channelStatus(settings).instagram) return [];
  const hotSwe = roles.filter((r) => r.hot && r.swe);
  const logs: DeliveryLog[] = [];
  const day = new Date().toISOString().slice(0, 10);

  for (const [company, companyRoles] of [...groupByCompany(hotSwe)].slice(0, INSTAGRAM_POSTS_PER_RUN)) {
    const count = await kv().incr(`ig:posts:${day}`, 60 * 60 * 26);
    if (count > INSTAGRAM_POSTS_PER_DAY) break;
    const id = randomId();
    await kv().set(cardKey(id), { company, roles: companyRoles.slice(0, 6) } satisfies InstagramCard, { ex: 60 * 60 * 48 });
    const res = await postInstagram(settings, `${appUrl()}/api/instagram/card/${id}`, instagramCaption(company, companyRoles, appUrl()));
    logs.push({
      at: Date.now(),
      subscriberId: "instagram",
      subscriberName: settings.instagramUsername ? `@${settings.instagramUsername}` : "Instagram",
      channel: "instagram",
      ok: res.ok,
      detail: res.detail,
      headline: `🔥 ${company} just opened ${companyRoles.length} internship role${companyRoles.length === 1 ? "" : "s"}`,
    });
  }
  return logs;
}

/** Long-lived Instagram tokens expire after 60 days unless refreshed. */
export async function maybeRefreshInstagramToken(settings: Settings) {
  if (!settings.instagramToken) return;
  const age = Date.now() - (settings.instagramTokenRefreshedAt ?? 0);
  if (age < 5 * 24 * 60 * 60 * 1000) return;
  try {
    const { access_token } = await refreshInstagramToken(settings.instagramToken);
    await saveSettings({ instagramToken: access_token, instagramTokenRefreshedAt: Date.now() });
  } catch (err) {
    console.error("Instagram token refresh failed", err);
  }
}

/* ------------------------------------------------------------------ test */

export async function sampleRoles(): Promise<Role[]> {
  const feed = await kv().lrange<Role>("feed:hot", 0, 20);
  const swe = feed.filter((r) => r.swe);
  return (swe.length ? swe : feed).slice(0, 3);
}

export async function sendTestAlert(sub: Subscriber, settings: Settings) {
  const roles = await sampleRoles();
  const alert = buildAlert(roles);
  if (!alert) return [];
  alert.headline = `[Test] ${alert.headline}`;
  const logs = await deliver(sub, alert, settings);
  await kv().lpush(DELIVERIES, logs, DELIVERY_LOG_LIMIT);
  return logs;
}
