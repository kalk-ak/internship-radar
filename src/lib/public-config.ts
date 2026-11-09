import type { ChannelConfig } from "@/components/subscription-fields";
import { channelStatus, getSettings } from "./settings";

export async function publicChannelConfig(): Promise<ChannelConfig> {
  const s = await getSettings();
  const status = channelStatus(s);
  return {
    emailReady: status.email,
    telegramReady: status.telegram && Boolean(s.telegramBotUsername),
    whatsappCloud: status.whatsappCloud,
    instagramHandle: status.instagram ? s.instagramUsername : undefined,
  };
}
