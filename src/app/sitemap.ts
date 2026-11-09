import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
import { DEV_PAGE_PATH } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = appUrl();
  return [
    { url, changeFrequency: "hourly", priority: 1 },
    { url: `${url}${DEV_PAGE_PATH}`, changeFrequency: "daily", priority: 0.9 },
  ];
}
