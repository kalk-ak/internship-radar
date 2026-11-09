"use server";

import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/auth";
import { readChannels, readPrefs, str } from "@/lib/forms";
import { sendTestAlert } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import {
  applyChannels,
  createSubscriber,
  deleteSubscriber,
  getByManageToken,
  InputError,
  manageUrl,
  resendEmailVerification,
  saveSubscriber,
  telegramStartUrl,
  type SetupReport,
} from "@/lib/subscribers";

export interface FormState {
  ok: boolean;
  message?: string;
  reports?: SetupReport[];
  manageUrl?: string;
  telegramUrl?: string | null;
}

function failure(err: unknown): FormState {
  if (err instanceof InputError) return { ok: false, message: err.message };
  console.error(err);
  return { ok: false, message: "Something went wrong on our side. Try again in a minute." };
}

export async function subscribeAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (str(form, "company_site")) return { ok: true, message: "Thanks!" }; // honeypot
  if (!(await rateLimit("subscribe", 6, 60 * 60))) {
    return { ok: false, message: "Too many sign-ups from this network. Try again in an hour." };
  }
  try {
    const channels = readChannels(form);
    const prefs = readPrefs(form);
    const { subscriber, reports } = await createSubscriber(str(form, "name") ?? "", channels, prefs);
    if (!subscriber) return { ok: true, reports };
    const settings = await getSettings();
    return {
      ok: true,
      reports,
      manageUrl: manageUrl(subscriber),
      telegramUrl: telegramStartUrl(subscriber, settings.telegramBotUsername),
    };
  } catch (err) {
    return failure(err);
  }
}

async function subscriberOrThrow(token: string) {
  const sub = await getByManageToken(token);
  if (!sub) throw new InputError("This manage link is no longer valid.");
  return sub;
}

export async function updateSubscriptionAction(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("manage", 20, 60 * 60, token))) {
    return { ok: false, message: "Too many changes in a short time. Try again later." };
  }
  try {
    const sub = await subscriberOrThrow(token);
    const name = str(form, "name")?.trim();
    if (name) sub.name = name.slice(0, 60);
    sub.prefs = readPrefs(form);
    const reports = await applyChannels(sub, readChannels(form));
    if (!Object.keys(sub.channels).length) {
      return { ok: false, message: "Keep at least one channel, or unsubscribe instead." };
    }
    await saveSubscriber(sub);
    const settings = await getSettings();
    return {
      ok: true,
      message: "Changes saved.",
      reports,
      telegramUrl: telegramStartUrl(sub, settings.telegramBotUsername),
    };
  } catch (err) {
    return failure(err);
  }
}

export async function resendEmailAction(token: string): Promise<FormState> {
  if (!(await rateLimit("resend", 3, 60 * 60, token))) return { ok: false, message: "Confirmation already sent recently. Check your inbox and spam folder." };
  try {
    const report = await resendEmailVerification(await subscriberOrThrow(token));
    return { ok: Boolean(report && report.status !== "failed"), message: report?.message ?? "Your email is already confirmed." };
  } catch (err) {
    return failure(err);
  }
}

export async function testAlertAction(token: string): Promise<FormState> {
  if (!(await rateLimit("test", 3, 60 * 60, token))) return { ok: false, message: "You can send 3 test alerts per hour." };
  try {
    const logs = await sendTestAlert(await subscriberOrThrow(token), await getSettings());
    if (!logs.length) return { ok: false, message: "No confirmed channels yet. Confirm one first, then try again." };
    const failed = logs.filter((l) => !l.ok);
    return failed.length
      ? { ok: false, message: `Sent, but these failed: ${failed.map((l) => `${l.channel} (${l.detail})`).join("; ")}` }
      : { ok: true, message: `Test alert sent to ${logs.map((l) => l.channel).join(", ")}.` };
  } catch (err) {
    return failure(err);
  }
}

export async function togglePauseAction(token: string): Promise<FormState> {
  try {
    const sub = await subscriberOrThrow(token);
    sub.paused = !sub.paused;
    await saveSubscriber(sub);
    return { ok: true, message: sub.paused ? "Alerts paused." : "Alerts resumed." };
  } catch (err) {
    return failure(err);
  }
}

export async function unsubscribeAction(token: string) {
  const sub = await getByManageToken(token);
  if (sub) await deleteSubscriber(sub);
  redirect("/?unsubscribed=1");
}
