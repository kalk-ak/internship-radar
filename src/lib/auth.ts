import { cookies, headers } from "next/headers";
import { hmac, safeEqual } from "./crypto";
import { kv } from "./kv";

const COOKIE = "ir_admin";
const SESSION_DAYS = 14;

function adminPassword() {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  // The "admin" fallback is for local development only, never on Vercel.
  return process.env.VERCEL ? null : "admin";
}

export function adminConfigured() {
  return adminPassword() !== null;
}

export function checkPassword(input: string) {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(hmac(input, "admin-password"), hmac(expected, "admin-password"));
}

export async function startAdminSession() {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const value = `${exp}.${hmac(String(exp), "admin-session")}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmac(exp, "admin-session"));
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorised");
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Fixed-window rate limit. Returns true when the call is allowed. */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number, id?: string) {
  const who = id ?? (await clientIp());
  const n = await kv().incr(`rl:${bucket}:${who}`, windowSeconds);
  return n <= limit;
}

export function cronAuthorized(authHeader: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return !process.env.VERCEL;
  return Boolean(authHeader) && safeEqual(authHeader!, `Bearer ${secret}`);
}
