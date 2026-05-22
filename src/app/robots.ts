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
        // The bare `/whatsapp` and `/timeline` landings stay allowed
        // (public demos). Everything *under* either (`/whatsapp/<slug>`,
        // `/timeline/<slug>`) is a private workspace/project and must
        // never be indexed. Those pages also emit `robots: noindex,
        // nofollow` metadata as a second line of defense.
        disallow: ["/api/", "/admin/", "/whatsapp/", "/timeline/"],
      },
    ],
    sitemap: "https://z-g.co.il/sitemap.xml",
  };
}
