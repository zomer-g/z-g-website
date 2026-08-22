import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site";
import { documentChunks } from "@/lib/sitemap-documents";

/**
 * Robots.txt configuration via Next.js metadata API.
 *
 * Allows all crawlers access to all public pages and lists every sitemap:
 * the hand-written one plus a slice per document corpus. Before this, the
 * only sitemap held 36 URLs while the site served ~41,000 indexable document
 * pages that nothing linked to.
 */

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The bare `/whatsapp` and `/timeline` landings stay allowed
        // (public demos). Everything *under* either (`/whatsapp/<slug>`,
        // `/timeline/<slug>`) is a private workspace/project and must
        // never be indexed. Those pages also emit `robots: noindex,
        // nofollow` metadata as a second line of defense.
        disallow: ["/api/", "/admin/", "/whatsapp/", "/timeline/"],
      },
    ],
    // The document sitemaps are listed individually rather than behind a
    // sitemap index: robots.txt is itself a perfectly good index, and one less
    // indirection is one less thing to get wrong. If the chunk plan cannot be
    // read (database hiccup), the main sitemap is still advertised.
    sitemap: [
      `${SITE_ORIGIN}/sitemap.xml`,
      ...(await documentChunks().catch(() => [])).map(
        (_, i) => `${SITE_ORIGIN}/sitemap-docs/${i}.xml`,
      ),
    ],
  };
}
