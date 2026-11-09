import { safeEqual } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { handleTelegramUpdate, telegramWebhookSecret } from "@/lib/telegram";

export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(secret, telegramWebhookSecret())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await handleTelegramUpdate(await request.json(), await getSettings());
  } catch (err) {
    // Always 200 so Telegram doesn't retry the same update forever.
    console.error("Telegram update failed", err);
  }
  return Response.json({ ok: true });
}
