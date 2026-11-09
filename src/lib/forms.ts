import { sanitizePrefs } from "./match";
import type { ChannelInput } from "./subscribers";
import type { Category, Prefs } from "./types";

export function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
}

export function readChannels(form: FormData): ChannelInput {
  const on = (k: string) => form.get(`use_${k}`) === "on";
  return {
    email: on("email") ? str(form, "email") ?? "" : "",
    telegram: on("telegram"),
    discordWebhook: on("discord") ? str(form, "discordWebhook") ?? "" : "",
    whatsappPhone: on("whatsapp") ? str(form, "whatsappPhone") ?? "" : "",
    callmebotKey: on("whatsapp") ? str(form, "callmebotKey") : undefined,
  };
}

export function readPrefs(form: FormData): Prefs {
  return sanitizePrefs({
    categories: form.getAll("categories").map(String) as Category[],
    hotOnly: form.get("hotOnly") === "on",
    watch: (str(form, "watch") ?? "").split(/[,\n]/),
  });
}
