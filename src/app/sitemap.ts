import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = "https://z-g.co.il";

// Force-dynamic + revalidate=0 so the sitemap re-queries the DB on
// EVERY request. Without this, Next.js could serve a stale cached
// sitemap for hours after a new article / service / page is published.
// Cost: one cheap Prisma SELECT per fetch (Google fetches sitemap.xml
// at most every few hours), which is negligible.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Entry = MetadataRoute.Sitemap[number];

const staticEntry = (
  path: string,
  changeFrequency: Entry["changeFrequency"],
  priority: number,
): Entry => ({
  url: path === "" ? SITE_URL : `${SITE_URL}${path}`,
  lastModified: new Date(),
  changeFrequency,
  priority,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* ── Static / hand-written pages ── */

  const staticPages: MetadataRoute.Sitemap = [
    staticEntry("", "weekly", 1.0),
    staticEntry("/about", "monthly", 0.8),
    staticEntry("/services", "monthly", 0.9),
    staticEntry("/articles", "weekly", 0.7),
    staticEntry("/media", "monthly", 0.6),
    staticEntry("/contact", "monthly", 0.7),
    // Public projects — these are high-traffic flagship pages and must be indexed.
    staticEntry("/projects", "weekly", 0.9),
    staticEntry("/guidelines", "daily", 1.0),
    staticEntry("/defamation-rulings", "weekly", 0.8),
    staticEntry("/foi-rulings", "weekly", 0.8),
    staticEntry("/rulings", "weekly", 0.7),
    staticEntry("/class-actions", "weekly", 0.7),
    staticEntry("/conditional-arrangements", "weekly", 0.7),
    staticEntry("/case-tracker", "monthly", 0.7),
    staticEntry("/legal-tools", "monthly", 0.7),
    staticEntry("/sanegoria", "monthly", 0.7),
    staticEntry("/digital-services", "monthly", 0.6),
    // /whatsapp is the public landing/demo (mock chats). Private workspace
    // sub-pages live under /whatsapp/<slug> and are blocked in robots.ts;
    // we deliberately do NOT enumerate them here.
    staticEntry("/whatsapp", "monthly", 0.5),
    // /timeline landing only — projects under it are private and live
    // in the robots disallow list.
    staticEntry("/timeline", "monthly", 0.5),
    staticEntry("/privacy", "yearly", 0.3),
    staticEntry("/accessibility", "yearly", 0.3),
    staticEntry("/terms", "yearly", 0.3),
  ];

  /* ── Dynamic: services from DB ── */

  let servicePages: MetadataRoute.Sitemap = [];
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    servicePages = services.map((s) => staticEntry(`/services/${s.slug}`, "monthly", 0.8));
  } catch {
    // DB unavailable — skip dynamic section rather than fail the whole sitemap.
  }

  /* ── Dynamic: published articles from DB ── */

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, publishedAt: true },
    });
    articlePages = posts.map((p) => ({
      url: `${SITE_URL}/articles/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // ignore
  }

  return [...staticPages, ...servicePages, ...articlePages];
}
