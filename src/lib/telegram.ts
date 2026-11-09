import { telegramApi } from "./channels";
import { hmac } from "./crypto";
import { appUrl } from "./env";
import { escapeHtml, locationLabel } from "./format";
import { kv } from "./kv";
import { saveSettings, type Settings } from "./settings";
import { linkTelegram, manageUrl, subscriberForTelegramChat, unlinkTelegramChat } from "./subscribers";
import type { Role } from "./types";

export function telegramWebhookSecret() {
  return hmac("telegram-webhook", "telegram").slice(0, 64);
}

/** Validates the token, caches the bot username and points the webhook at this deployment. */
export async function connectTelegramBot(token: string) {
  const me = await telegramApi<{ username: string }>(token, "getMe");
  await telegramApi(token, "setWebhook", {
    url: `${appUrl()}/api/telegram/webhook`,
    secret_token: telegramWebhookSecret(),
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  await telegramApi(token, "setMyCommands", {
    commands: [
      { command: "latest", description: "Latest hot internship drops" },
      { command: "status", description: "Your alert settings" },
      { command: "stop", description: "Stop Telegram alerts" },
    ],
  });
  await saveSettings({ telegramBotUsername: me.username });
  return me.username;
}

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { username?: string; first_name?: string };
  };
}

export async function handleTelegramUpdate(update: TelegramUpdate, settings: Settings) {
  const msg = update.message;
  const token = settings.telegramBotToken;
  if (!msg?.text || !token) return;
  const chatId = msg.chat.id;
  const reply = (text: string) =>
    telegramApi(token, "sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

  const [command, arg] = msg.text.trim().split(/\s+/, 2);
  switch (command.split("@")[0]) {
    case "/start": {
      if (arg) {
        const sub = await linkTelegram(arg, chatId, msg.from?.username);
        if (sub) {
          await reply(
            `✅ Connected, <b>${escapeHtml(sub.name)}</b>! You'll get a message here whenever a top company opens internship roles that match your settings.\n\n/latest shows recent drops · /stop unsubscribes this chat\n<a href="${manageUrl(sub)}">Manage your alerts</a>`,
          );
          return;
        }
      }
      await reply(
        `👋 This bot sends alerts when top companies open internship roles.\n\nSign up at ${appUrl()} and pick Telegram to connect this chat.`,
      );
      return;
    }
    case "/stop": {
      const sub = await unlinkTelegramChat(chatId);
      await reply(sub ? "🔕 Telegram alerts are off for this chat. You can reconnect from your manage page." : "This chat isn't subscribed.");
      return;
    }
    case "/status": {
      const sub = await subscriberForTelegramChat(chatId);
      await reply(
        sub
          ? `You're subscribed as <b>${escapeHtml(sub.name)}</b>.\nCategories: ${sub.prefs.categories.join(", ")}\nTop companies only: ${sub.prefs.hotOnly ? "yes" : "no"}${sub.paused ? "\n⏸ Alerts are paused" : ""}\n<a href="${manageUrl(sub)}">Manage</a>`
          : `This chat isn't subscribed yet. Sign up at ${appUrl()}`,
      );
      return;
    }
    case "/latest": {
      const feed = (await kv().lrange<Role>("feed:hot", 0, 30)).filter((r) => r.swe).slice(0, 8);
      if (!feed.length) {
        await reply("Nothing yet. Check back soon!");
        return;
      }
      const lines = feed.map(
        (r) => `🔥 <b>${escapeHtml(r.company)}</b> · <a href="${escapeHtml(r.url)}">${escapeHtml(r.title)}</a>\n   <i>${escapeHtml(locationLabel(r))}</i>`,
      );
      await reply(`<b>Latest hot SWE drops</b>\n\n${lines.join("\n")}`);
      return;
    }
    default:
      await reply("Commands: /latest · /status · /stop");
  }
}
