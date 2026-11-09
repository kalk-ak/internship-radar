import { decrypt, encrypt } from "./crypto";
import { kv } from "./kv";

/**
 * Channel credentials. They can come from environment variables or be
 * entered in the admin dashboard, where they are stored AES-GCM encrypted.
 * Environment variables win when both are present.
 */
export interface Settings {
  emailUser?: string; // Gmail address used to send
  emailPassword?: string; // Gmail app password
  smtpHost?: string; // optional: any other SMTP provider
  smtpPort?: string;
  emailFrom?: string; // optional display "From"
  telegramBotToken?: string;
  telegramBotUsername?: string; // cached from getMe
  whatsappToken?: string; // Meta WhatsApp Cloud API
  whatsappPhoneNumberId?: string;
  whatsappTemplate?: string;
  whatsappTemplateLang?: string;
  instagramToken?: string; // Instagram API with Instagram Login, long-lived token (admin UI only: it is auto-refreshed)
  instagramUserId?: string;
  instagramUsername?: string;
  instagramTokenRefreshedAt?: number;
  extraHotCompanies?: string[];
}

export const SECRET_FIELDS = ["emailPassword", "telegramBotToken", "whatsappToken", "instagramToken"] as const;

const ENV_MAP: Partial<Record<keyof Settings, string>> = {
  emailUser: "GMAIL_USER",
  emailPassword: "GMAIL_APP_PASSWORD",
  smtpHost: "SMTP_HOST",
  smtpPort: "SMTP_PORT",
  emailFrom: "EMAIL_FROM",
  telegramBotToken: "TELEGRAM_BOT_TOKEN",
  whatsappToken: "WHATSAPP_TOKEN",
  whatsappPhoneNumberId: "WHATSAPP_PHONE_NUMBER_ID",
  whatsappTemplate: "WHATSAPP_TEMPLATE",
  whatsappTemplateLang: "WHATSAPP_TEMPLATE_LANG",
};

const KEY = "settings:v1";

export async function getStoredSettings(): Promise<Settings> {
  const stored = await kv().get<string>(KEY);
  if (!stored) return {};
  try {
    return JSON.parse(decrypt(stored)) as Settings;
  } catch (err) {
    console.error("Could not decrypt stored settings (did APP_SECRET change?)", err);
    return {};
  }
}

export async function getSettings(): Promise<Settings> {
  const settings = await getStoredSettings();
  for (const [field, envName] of Object.entries(ENV_MAP)) {
    const value = envName ? process.env[envName] : undefined;
    if (value) (settings as Record<string, unknown>)[field] = value;
  }
  return settings;
}

export function envLocked(field: keyof Settings): boolean {
  const envName = ENV_MAP[field];
  return Boolean(envName && process.env[envName]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getStoredSettings();
  const next: Settings = { ...current };
  for (const [k, v] of Object.entries(patch) as [keyof Settings, unknown][]) {
    if (v === undefined) continue;
    if (v === "" || v === null) delete next[k];
    else (next as Record<string, unknown>)[k] = v;
  }
  await kv().set(KEY, encrypt(JSON.stringify(next)));
  return next;
}

export function channelStatus(s: Settings) {
  return {
    email: Boolean(s.emailUser && s.emailPassword),
    telegram: Boolean(s.telegramBotToken),
    discord: true,
    whatsappCloud: Boolean(s.whatsappToken && s.whatsappPhoneNumberId),
    whatsapp: true, // CallMeBot fallback needs no server credentials
    instagram: Boolean(s.instagramToken),
  };
}
