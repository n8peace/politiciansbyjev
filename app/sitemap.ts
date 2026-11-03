import type { MetadataRoute } from "next";
import { LATEST } from "@/lib/releases";
import { INDEXED, SITE_URL, askUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/how-it-works/scoring`, lastModified: new Date("2026-11-03"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/releases`, lastModified: new Date(LATEST), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/questions`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...INDEXED.map((q) => ({ url: askUrl(q), lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
    { url: `${SITE_URL}/credits`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
