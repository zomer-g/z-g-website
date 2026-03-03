import type { MetadataRoute } from "next";

/**
 * Dynamic sitemap generator for the law firm website.
 *
 * Includes all public pages with appropriate change frequencies
 * and priority values. Service and article slugs are maintained
 * here statically until a database/CMS is integrated.
 */

const SITE_URL = "https://z-g.co.il";

/* ─── Service Slugs ─── */

const SERVICE_SLUGS = [
  "corporate-law",
  "real-estate",
  "litigation",
  "labor-law",
  "intellectual-property",
  "tax-law",
] as const;

/* ─── Article Slugs ─── */

const ARTICLE_SLUGS = [
  "corporate-governance-guide",
  "real-estate-tax-reform",
  "class-action-trends",
  "remote-work-legal-aspects",
  "ai-intellectual-property",
  "international-tax-planning",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /* ── Static Pages ── */

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/media`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/accessibility`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  /* ── Service Detail Pages ── */

  const servicePages: MetadataRoute.Sitemap = SERVICE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/services/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  /* ── Article Detail Pages ── */

  const articlePages: MetadataRoute.Sitemap = ARTICLE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/articles/${slug}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...servicePages, ...articlePages];
}
