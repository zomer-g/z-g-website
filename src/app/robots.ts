import type { MetadataRoute } from "next";

/**
 * Robots.txt configuration via Next.js metadata API.
 *
 * Allows all crawlers access to all public pages and
 * references the sitemap for efficient indexing.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The bare `/whatsapp` landing stays allowed (it's a public demo).
        // Everything *under* it (`/whatsapp/<slug>`) is a private workspace
        // and must never be indexed. Workspace pages also emit
        // `robots: noindex, nofollow` metadata as a second line of defense.
        disallow: ["/api/", "/admin/", "/whatsapp/"],
      },
    ],
    sitemap: "https://z-g.co.il/sitemap.xml",
  };
}
