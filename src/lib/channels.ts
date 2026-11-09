import nodemailer from "nodemailer";
import type { Settings } from "./settings";

export type SendResult = { ok: true; detail?: string } | { ok: false; detail: string };

const TIMEOUT_MS = 15_000;

async function http(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function failure(res: Response, label: string): Promise<SendResult> {
  const body = (await res.text().catch(() => "")).slice(0, 300);
  return { ok: false, detail: `${label} ${res.status}: ${body}` };
}

function errorResult(err: unknown): SendResult {
  return { ok: false, detail: err instanceof Error ? err.message : String(err) };
}

/* ----------------------------------------------------------------- email */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
}

export async function sendEmail(settings: Settings, msg: EmailMessage): Promise<SendResult> {
  if (!settings.emailUser || !settings.emailPassword) return { ok: false, detail: "Email sending is not configured" };
  try {
    const port = Number(settings.smtpPort || 465);
    const transport = nodemailer.createTransport({
      host: settings.smtpHost || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: settings.emailUser, pass: settings.emailPassword.replace(/\s+/g, "") },
    });
    const info = await transport.sendMail({
      from: settings.emailFrom || `Internship Radar <${settings.emailUser}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: msg.unsubscribeUrl ? { "List-Unsubscribe": `<${msg.unsubscribeUrl}>` } : undefined,
    });
    return { ok: true, detail: info.messageId };
  } catch (err) {
    return errorResult(err);
  }
}

/* -------------------------------------------------------------- telegram */

export async function telegramApi<T = unknown>(token: string, method: string, body?: unknown): Promise<T> {
  const res = await http(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result as T;
}

export async function sendTelegram(settings: Settings, chatId: number, html: string): Promise<SendResult> {
  if (!settings.telegramBotToken) return { ok: false, detail: "Telegram bot is not configured" };
  try {
    await telegramApi(settings.telegramBotToken, "sendMessage", {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

/* --------------------------------------------------------------- discord */

const DISCORD_WEBHOOK = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d{5,30}\/[\w-]{20,120}$/;

export function isDiscordWebhook(url: string) {
  return DISCORD_WEBHOOK.test(url.trim());
}

export async function sendDiscord(webhookUrl: string, payload: unknown): Promise<SendResult> {
  if (!isDiscordWebhook(webhookUrl)) return { ok: false, detail: "Invalid Discord webhook URL" };
  try {
    const res = await http(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok ? { ok: true } : failure(res, "Discord");
  } catch (err) {
    return errorResult(err);
  }
}

/* -------------------------------------------------------------- whatsapp */

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/** Official Meta WhatsApp Cloud API. Uses a template when configured (required outside the 24h window). */
export async function sendWhatsAppCloud(
  settings: Settings,
  phone: string,
  text: string,
  templateParams: string[],
): Promise<SendResult> {
  if (!settings.whatsappToken || !settings.whatsappPhoneNumberId) {
    return { ok: false, detail: "WhatsApp Cloud API is not configured" };
  }
  const body = settings.whatsappTemplate
    ? {
        messaging_product: "whatsapp",
        to: phone.replace("+", ""),
        type: "template",
        template: {
          name: settings.whatsappTemplate,
          language: { code: settings.whatsappTemplateLang || "en_US" },
          components:
            settings.whatsappTemplate === "hello_world"
              ? undefined
              : [{ type: "body", parameters: templateParams.map((t) => ({ type: "text", text: t })) }],
        },
      }
    : { messaging_product: "whatsapp", to: phone.replace("+", ""), type: "text", text: { body: text.slice(0, 4096) } };
  try {
    const res = await http(`https://graph.facebook.com/v23.0/${settings.whatsappPhoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.whatsappToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? { ok: true } : failure(res, "WhatsApp Cloud");
  } catch (err) {
    return errorResult(err);
  }
}

/** CallMeBot: free, unofficial. Each recipient gets their own API key. */
export async function sendCallMeBot(phone: string, apiKey: string, text: string): Promise<SendResult> {
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", text.slice(0, 1500));
  url.searchParams.set("apikey", apiKey);
  try {
    const res = await http(url.toString());
    const body = await res.text();
    const delivered = /queued|sent/i.test(body);
    const rejected = /error|invalid|not\s+(valid|allowed|registered)/i.test(body);
    if (!res.ok || (rejected && !delivered)) {
      return { ok: false, detail: `CallMeBot ${res.status}: ${body.replace(/<[^>]+>/g, " ").trim().slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return errorResult(err);
  }
}

/* ------------------------------------------------------------- instagram */

const IG = "https://graph.instagram.com";

export async function instagramMe(token: string) {
  const res = await http(`${IG}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`Instagram /me ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { user_id: string; username: string; id: string };
}

export async function refreshInstagramToken(token: string) {
  const res = await http(
    `${IG}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
  );
  if (!res.ok) throw new Error(`Instagram token refresh ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

/** Publishes a single-image feed post. `imageUrl` must be a public JPEG. */
export async function postInstagram(settings: Settings, imageUrl: string, caption: string): Promise<SendResult> {
  const token = settings.instagramToken;
  if (!token) return { ok: false, detail: "Instagram is not configured" };
  try {
    const userId = settings.instagramUserId || (await instagramMe(token)).user_id;
    const create = await http(`${IG}/${userId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ image_url: imageUrl, caption }),
    });
    if (!create.ok) return failure(create, "Instagram create");
    const { id: creationId } = (await create.json()) as { id: string };

    // Containers are usually ready immediately for images; poll briefly just in case.
    for (let i = 0; i < 5; i++) {
      const status = await http(`${IG}/${creationId}?fields=status_code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { status_code } = (await status.json()) as { status_code?: string };
      if (status_code === "FINISHED" || !status_code) break;
      if (status_code === "ERROR") return { ok: false, detail: "Instagram rejected the image" };
      await new Promise((r) => setTimeout(r, 1500));
    }

    const publish = await http(`${IG}/${userId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ creation_id: creationId }),
    });
    if (!publish.ok) return failure(publish, "Instagram publish");
    const { id } = (await publish.json()) as { id: string };
    return { ok: true, detail: id };
  } catch (err) {
    return errorResult(err);
  }
}
