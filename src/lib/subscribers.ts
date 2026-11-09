import { isDiscordWebhook, normalizePhone, sendCallMeBot, sendDiscord, sendEmail, sendWhatsAppCloud } from "./channels";
import { randomId, randomToken } from "./crypto";
import { appUrl } from "./env";
import { escapeHtml } from "./format";
import { kv } from "./kv";
import { sanitizePrefs } from "./match";
import { channelStatus, getSettings, type Settings } from "./settings";
import type { Prefs, Subscriber } from "./types";

const SUBS = "subs";
const subKey = (id: string) => `sub:${id}`;
const idx = {
  manage: (t: string) => `idx:manage:${t}`,
  emailVerify: (t: string) => `idx:email-verify:${t}`,
  email: (a: string) => `idx:email:${a.toLowerCase()}`,
  tgCode: (c: string) => `idx:tg-code:${c}`,
  tgChat: (id: number) => `idx:tg-chat:${id}`,
};

export class InputError extends Error {}

export function manageUrl(sub: Pick<Subscriber, "manageToken">) {
  return `${appUrl()}/manage/${sub.manageToken}`;
}

export function telegramStartUrl(sub: Subscriber, botUsername?: string) {
  if (!botUsername || !sub.channels.telegram) return null;
  return `https://t.me/${botUsername}?start=${sub.channels.telegram.linkCode}`;
}

export async function getSubscriber(id: string) {
  return kv().get<Subscriber>(subKey(id));
}

export async function getByManageToken(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const id = await kv().get<string>(idx.manage(token));
  return id ? getSubscriber(id) : null;
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const ids = await kv().smembers(SUBS);
  const subs = await kv().mget<Subscriber>(ids.map(subKey));
  return subs.filter((s): s is Subscriber => Boolean(s)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveSubscriber(sub: Subscriber) {
  await kv().set(subKey(sub.id), sub);
}

export async function deleteSubscriber(sub: Subscriber) {
  const keys = [subKey(sub.id), idx.manage(sub.manageToken)];
  const { email, telegram } = sub.channels;
  if (email) keys.push(idx.email(email.address));
  if (email?.verifyToken) keys.push(idx.emailVerify(email.verifyToken));
  if (telegram) keys.push(idx.tgCode(telegram.linkCode));
  if (telegram?.chatId) keys.push(idx.tgChat(telegram.chatId));
  await kv().del(...keys);
  await kv().srem(SUBS, sub.id);
}

export function hasVerifiedChannel(sub: Subscriber) {
  return Object.values(sub.channels).some((c) => c?.verified);
}

/* ---------------------------------------------------------- input model */

export interface ChannelInput {
  email?: string;
  telegram?: boolean;
  discordWebhook?: string;
  whatsappPhone?: string;
  callmebotKey?: string;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,}$/i;

function cleanEmail(raw: string | undefined) {
  const v = raw?.trim().toLowerCase();
  if (!v) return undefined;
  if (!EMAIL_RE.test(v)) throw new InputError("That email address doesn't look right.");
  return v;
}

export interface SetupReport {
  channel: string;
  status: "verified" | "pending" | "failed";
  message: string;
}

/* -------------------------------------------------------- verification */

async function sendEmailVerification(sub: Subscriber, settings: Settings): Promise<SetupReport> {
  const email = sub.channels.email!;
  if (!channelStatus(settings).email) {
    return { channel: "email", status: "pending", message: "Email sending isn't configured yet. We'll confirm your address once it is." };
  }
  email.verifyToken = randomToken();
  await kv().set(idx.emailVerify(email.verifyToken), sub.id, { ex: 60 * 60 * 24 * 7 });
  const link = `${appUrl()}/api/verify/email?token=${email.verifyToken}`;
  const res = await sendEmail(settings, {
    to: email.address,
    subject: "Confirm your Internship Radar alerts",
    text: `Hi ${sub.name},\n\nConfirm your email to start getting internship alerts:\n${link}\n\nIf you didn't sign up, ignore this email.`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1b1813">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b45309;font-weight:700">Internship Radar</p>
      <h1 style="font-size:22px">Confirm your email, ${escapeHtml(sub.name)}</h1>
      <p>Click below to start getting alerts when top companies open internship roles.</p>
      <p><a href="${link}" style="display:inline-block;background:#1b1813;color:#fff8ef;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Confirm email</a></p>
      <p style="font-size:12px;color:#8a8175">If you didn't sign up, you can ignore this email.</p></div>`,
  });
  return res.ok
    ? { channel: "email", status: "pending", message: `Check ${email.address} for a confirmation link.` }
    : { channel: "email", status: "failed", message: `Couldn't send the confirmation email: ${res.detail}` };
}

async function verifyDiscord(sub: Subscriber): Promise<SetupReport> {
  const res = await sendDiscord(sub.channels.discord!.webhookUrl, {
    username: "Internship Radar",
    content: `✅ **${sub.name}**, this channel will now get internship alerts. Manage them here: ${manageUrl(sub)}`,
    allowed_mentions: { parse: [] },
  });
  sub.channels.discord!.verified = res.ok;
  return res.ok
    ? { channel: "discord", status: "verified", message: "Sent a test message to your Discord channel." }
    : { channel: "discord", status: "failed", message: `Discord rejected the webhook: ${res.detail}` };
}

async function verifyWhatsApp(sub: Subscriber, settings: Settings): Promise<SetupReport> {
  const wa = sub.channels.whatsapp!;
  const text = `✅ Internship Radar: you're subscribed, ${sub.name}! You'll get alerts here when top companies open internship roles. Manage: ${manageUrl(sub)}`;
  const res = channelStatus(settings).whatsappCloud
    ? await sendWhatsAppCloud(settings, wa.phone, text, [
        `You're subscribed to Internship Radar, ${sub.name}`,
        "You'll get a message here when top companies open internship roles",
        manageUrl(sub),
      ])
    : wa.callmebotKey
      ? await sendCallMeBot(wa.phone, wa.callmebotKey, text)
      : { ok: false as const, detail: "A CallMeBot API key is required (see the instructions on the signup form)." };
  wa.verified = res.ok;
  return res.ok
    ? { channel: "whatsapp", status: "verified", message: `Sent a test WhatsApp message to ${wa.phone}.` }
    : { channel: "whatsapp", status: "failed", message: `WhatsApp test failed: ${res.detail}` };
}

/* ---------------------------------------------------- create / update */

export async function applyChannels(
  sub: Subscriber,
  input: ChannelInput,
  opts: { trustEmail?: boolean } = {},
): Promise<SetupReport[]> {
  const settings = await getSettings();
  const reports: SetupReport[] = [];

  // Email
  const email = cleanEmail(input.email);
  const prevEmail = sub.channels.email;
  if (email && email !== prevEmail?.address) {
    const owner = await kv().get<string>(idx.email(email));
    if (owner && owner !== sub.id) throw new InputError("That email is already subscribed. Use the manage link from one of your alert emails.");
    if (prevEmail) await kv().del(idx.email(prevEmail.address));
    sub.channels.email = { address: email, verified: Boolean(opts.trustEmail) };
    await kv().set(idx.email(email), sub.id);
    if (opts.trustEmail) reports.push({ channel: "email", status: "verified", message: `Alerts will go to ${email}.` });
    else reports.push(await sendEmailVerification(sub, settings));
  } else if (!email && input.email !== undefined && prevEmail) {
    await kv().del(idx.email(prevEmail.address));
    delete sub.channels.email;
  }

  // Telegram
  if (input.telegram && !sub.channels.telegram) {
    const linkCode = randomToken(12);
    sub.channels.telegram = { linkCode, verified: false };
    await kv().set(idx.tgCode(linkCode), sub.id);
    reports.push({
      channel: "telegram",
      status: "pending",
      message: settings.telegramBotUsername
        ? "Open the Telegram link and press Start to connect."
        : "Telegram isn't configured yet. Come back to your manage page once it is.",
    });
  } else if (input.telegram === false && sub.channels.telegram) {
    const tg = sub.channels.telegram;
    await kv().del(idx.tgCode(tg.linkCode), ...(tg.chatId ? [idx.tgChat(tg.chatId)] : []));
    delete sub.channels.telegram;
  }

  // Discord
  const webhook = input.discordWebhook?.trim();
  if (webhook && webhook !== sub.channels.discord?.webhookUrl) {
    if (!isDiscordWebhook(webhook)) throw new InputError("Discord webhook URLs look like https://discord.com/api/webhooks/123/abc…");
    sub.channels.discord = { webhookUrl: webhook, verified: false };
    reports.push(await verifyDiscord(sub));
  } else if (webhook === "" && sub.channels.discord) {
    delete sub.channels.discord;
  }

  // WhatsApp
  const rawPhone = input.whatsappPhone?.trim();
  if (rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!phone) throw new InputError("Use an international phone number, e.g. +1 415 555 0123.");
    const key = input.callmebotKey?.trim() || undefined;
    const prev = sub.channels.whatsapp;
    if (phone !== prev?.phone || (key && key !== prev?.callmebotKey) || !prev?.verified) {
      sub.channels.whatsapp = { phone, callmebotKey: key ?? prev?.callmebotKey, verified: false };
      reports.push(await verifyWhatsApp(sub, settings));
    }
  } else if (rawPhone === "" && sub.channels.whatsapp) {
    delete sub.channels.whatsapp;
  }

  await saveSubscriber(sub);
  return reports;
}

export async function createSubscriber(
  name: string,
  channels: ChannelInput,
  prefs: Partial<Prefs>,
  opts: { trustEmail?: boolean } = {},
) {
  const cleanName = name.trim().slice(0, 60);
  if (!cleanName) throw new InputError("Please tell us your name.");
  if (!channels.email && !channels.telegram && !channels.discordWebhook && !channels.whatsappPhone) {
    throw new InputError("Pick at least one place to get alerts.");
  }

  // Existing email: resend the manage link instead of creating a duplicate.
  const email = cleanEmail(channels.email);
  if (email) {
    const existingId = await kv().get<string>(idx.email(email));
    const existing = existingId ? await getSubscriber(existingId) : null;
    if (existing) {
      const settings = await getSettings();
      if (channelStatus(settings).email) {
        await sendEmail(settings, {
          to: email,
          subject: "Your Internship Radar manage link",
          text: `You're already subscribed. Manage your alerts here: ${manageUrl(existing)}`,
          html: `<p>You're already subscribed to Internship Radar.</p><p><a href="${manageUrl(existing)}">Manage your alerts</a></p>`,
        });
      }
      return { subscriber: null, reports: [{ channel: "email", status: "pending", message: "You're already subscribed. We emailed you your manage link." } satisfies SetupReport] };
    }
  }

  const sub: Subscriber = {
    id: randomId(),
    name: cleanName,
    createdAt: Date.now(),
    manageToken: randomToken(),
    prefs: sanitizePrefs(prefs),
    channels: {},
    paused: false,
    alertsSent: 0,
  };
  await kv().set(idx.manage(sub.manageToken), sub.id);
  await kv().sadd(SUBS, sub.id);
  const reports = await applyChannels(sub, channels, opts);
  return { subscriber: sub, reports };
}

export async function resendEmailVerification(sub: Subscriber) {
  if (!sub.channels.email || sub.channels.email.verified) return null;
  const report = await sendEmailVerification(sub, await getSettings());
  await saveSubscriber(sub);
  return report;
}

/** Marks an existing subscriber's email as confirmed (admin vouching for their own address). */
export async function markEmailVerified(address: string) {
  const id = await kv().get<string>(idx.email(address));
  const sub = id ? await getSubscriber(id) : null;
  if (!sub?.channels.email) return null;
  if (sub.channels.email.verifyToken) await kv().del(idx.emailVerify(sub.channels.email.verifyToken));
  sub.channels.email = { address: sub.channels.email.address, verified: true };
  await saveSubscriber(sub);
  return sub;
}

/** After email is switched on, send confirmations to everyone who signed up while it was off. */
export async function sendPendingEmailVerifications(limit = 100) {
  const settings = await getSettings();
  if (!channelStatus(settings).email) return 0;
  let sent = 0;
  for (const sub of await listSubscribers()) {
    if (sent >= limit) break;
    if (!sub.channels.email || sub.channels.email.verified) continue;
    const report = await sendEmailVerification(sub, settings);
    await saveSubscriber(sub);
    if (report.status !== "failed") sent++;
  }
  return sent;
}

export async function verifyEmailToken(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const id = await kv().get<string>(idx.emailVerify(token));
  const sub = id ? await getSubscriber(id) : null;
  if (!sub?.channels.email || sub.channels.email.verifyToken !== token) return null;
  sub.channels.email.verified = true;
  delete sub.channels.email.verifyToken;
  await saveSubscriber(sub);
  await kv().del(idx.emailVerify(token));
  return sub;
}

export async function linkTelegram(code: string, chatId: number, username?: string) {
  const id = await kv().get<string>(idx.tgCode(code));
  const sub = id ? await getSubscriber(id) : null;
  if (!sub?.channels.telegram) return null;
  const prevChat = sub.channels.telegram.chatId;
  if (prevChat && prevChat !== chatId) await kv().del(idx.tgChat(prevChat));
  sub.channels.telegram = { ...sub.channels.telegram, chatId, username, verified: true };
  await saveSubscriber(sub);
  await kv().set(idx.tgChat(chatId), sub.id);
  return sub;
}

export async function subscriberForTelegramChat(chatId: number) {
  const id = await kv().get<string>(idx.tgChat(chatId));
  return id ? getSubscriber(id) : null;
}

export async function unlinkTelegramChat(chatId: number) {
  const sub = await subscriberForTelegramChat(chatId);
  if (!sub?.channels.telegram) return null;
  await kv().del(idx.tgChat(chatId), idx.tgCode(sub.channels.telegram.linkCode));
  delete sub.channels.telegram;
  await saveSubscriber(sub);
  return sub;
}
