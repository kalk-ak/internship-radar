import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

// Answer engines are welcome: they're how many students search for internships now.
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];
const PRIVATE = ["/admin", "/manage/", "/api/check", "/api/telegram/", "/api/verify/", "/api/instagram/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/api/roles"], disallow: PRIVATE },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
