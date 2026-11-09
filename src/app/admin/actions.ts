"use server";

import { revalidatePath } from "next/cache";
import { checkPassword, endAdminSession, rateLimit, requireAdmin, startAdminSession } from "@/lib/auth";
import { instagramMe, telegramApi } from "@/lib/channels";
import { runCheck } from "@/lib/checker";
import { readChannels, readPrefs, str } from "@/lib/forms";
import { sendTestAlert } from "@/lib/notify";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";
import { createSubscriber, deleteSubscriber, getSubscriber, InputError, saveSubscriber } from "@/lib/subscribers";
import { connectTelegramBot } from "@/lib/telegram";
import type { FormState } from "../actions";

function fail(err: unknown): FormState {
  if (err instanceof InputError) return { ok: false, message: err.message };
  return { ok: false, message: err instanceof Error ? err.message : String(err) };
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("admin-login", 8, 15 * 60))) return { ok: false, message: "Too many attempts. Wait 15 minutes." };
  if (!checkPassword(str(form, "password") ?? "")) return { ok: false, message: "That password isn't right." };
  await startAdminSession();
  revalidatePath("/admin");
  return { ok: true };
}

export async function logoutAction() {
  await endAdminSession();
  revalidatePath("/admin");
}

export async function runCheckAction(): Promise<FormState> {
  await requireAdmin();
  const log = await runCheck("admin", { force: true });
  revalidatePath("/admin");
  if (log.skipped) return { ok: false, message: log.skipped };
  if (log.error) return { ok: false, message: `Check failed: ${log.error}` };
  return {
    ok: true,
    message: log.baseline
      ? "First check done. Current listings are saved as the baseline; new ones from now on will alert."
      : `Check done: ${log.newRoles} new roles (${log.newHot} at top companies), ${log.alerts} subscribers alerted.`,
  };
}

type Section = "email" | "telegram" | "whatsapp" | "instagram";

export async function saveChannelSettingsAction(section: Section, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const val = (k: string) => str(form, k)?.trim();
  // Blank secret fields keep the stored value; tick "remove" to clear a channel.
  const clear = form.get("clear") === "on";
  try {
    let patch: Partial<Settings> = {};
    let message = "Saved.";
    if (section === "email") {
      patch = clear
        ? { emailUser: "", emailPassword: "", smtpHost: "", smtpPort: "", emailFrom: "" }
        : { emailUser: val("emailUser"), emailPassword: val("emailPassword") || undefined, smtpHost: val("smtpHost") ?? "", smtpPort: val("smtpPort") ?? "", emailFrom: val("emailFrom") ?? "" };
      await saveSettings(patch);
      if (!clear && form.get("subscribeSelf") === "on" && patch.emailUser) {
        await createSubscriber("Admin", { email: patch.emailUser }, { categories: ["Software"], hotOnly: true }, { trustEmail: true }).catch(() => null);
        message = `Saved. ${patch.emailUser} is subscribed to hot SWE alerts.`;
      }
    }
    if (section === "telegram") {
      if (clear) {
        const { telegramBotToken } = await getSettings();
        if (telegramBotToken) await telegramApi(telegramBotToken, "deleteWebhook").catch(() => null);
        await saveSettings({ telegramBotToken: "", telegramBotUsername: "" });
      } else {
        const token = val("telegramBotToken") || (await getSettings()).telegramBotToken;
        if (!token) return { ok: false, message: "Paste the bot token from @BotFather." };
        await saveSettings({ telegramBotToken: token });
        const username = await connectTelegramBot(token);
        message = `Connected @${username}. The webhook points at this site.`;
      }
    }
    if (section === "whatsapp") {
      patch = clear
        ? { whatsappToken: "", whatsappPhoneNumberId: "", whatsappTemplate: "", whatsappTemplateLang: "" }
        : { whatsappToken: val("whatsappToken") || undefined, whatsappPhoneNumberId: val("whatsappPhoneNumberId"), whatsappTemplate: val("whatsappTemplate") ?? "", whatsappTemplateLang: val("whatsappTemplateLang") ?? "" };
      await saveSettings(patch);
    }
    if (section === "instagram") {
      if (clear) {
        await saveSettings({ instagramToken: "", instagramUserId: "", instagramUsername: "", instagramTokenRefreshedAt: 0 });
      } else {
        const token = val("instagramToken") || (await getSettings()).instagramToken;
        if (!token) return { ok: false, message: "Paste a long-lived Instagram access token." };
        const me = await instagramMe(token);
        await saveSettings({ instagramToken: token, instagramUserId: me.user_id, instagramUsername: me.username, instagramTokenRefreshedAt: Date.now() });
        message = `Connected @${me.username}. Hot SWE drops will be posted there.`;
      }
    }
    revalidatePath("/admin");
    return { ok: true, message: clear ? "Removed." : message };
  } catch (err) {
    return fail(err);
  }
}

export async function saveCompaniesAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const extra = (str(form, "extraHotCompanies") ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
  await saveSettings({ extraHotCompanies: [...new Set(extra)] });
  revalidatePath("/admin");
  return { ok: true, message: `Saved ${extra.length} extra companies. They apply from the next check.` };
}

export async function adminAddSubscriberAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const { subscriber, reports } = await createSubscriber(str(form, "name") ?? "", readChannels(form), readPrefs(form), {
      trustEmail: form.get("trustEmail") === "on",
    });
    revalidatePath("/admin");
    return { ok: Boolean(subscriber), message: subscriber ? `Added ${subscriber.name}.` : undefined, reports };
  } catch (err) {
    return fail(err);
  }
}

export async function adminSubscriberAction(id: string, op: "test" | "pause" | "delete"): Promise<FormState> {
  await requireAdmin();
  const sub = await getSubscriber(id);
  if (!sub) return { ok: false, message: "Subscriber not found." };
  try {
    if (op === "delete") {
      await deleteSubscriber(sub);
      revalidatePath("/admin");
      return { ok: true, message: `Removed ${sub.name}.` };
    }
    if (op === "pause") {
      sub.paused = !sub.paused;
      await saveSubscriber(sub);
      revalidatePath("/admin");
      return { ok: true, message: sub.paused ? `Paused ${sub.name}.` : `Resumed ${sub.name}.` };
    }
    const logs = await sendTestAlert(sub, await getSettings());
    revalidatePath("/admin");
    if (!logs.length) return { ok: false, message: `${sub.name} has no confirmed channels.` };
    const failed = logs.filter((l) => !l.ok);
    return failed.length
      ? { ok: false, message: failed.map((l) => `${l.channel}: ${l.detail}`).join("; ") }
      : { ok: true, message: `Test sent to ${sub.name} via ${logs.map((l) => l.channel).join(", ")}.` };
  } catch (err) {
    return fail(err);
  }
}
