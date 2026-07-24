import type { MetadataRoute } from "next";
import { levels, levelRanges } from "@/lib/levels";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-24");
  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${siteUrl}/levels`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...levelRanges.map((range) => ({
      url: `${siteUrl}${range.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...levels.map((level) => ({
      url: `${siteUrl}/level/${level.levelId}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${siteUrl}/about`, lastModified, priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified, priority: 0.3 },
  ];
}
