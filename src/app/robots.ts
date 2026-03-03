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
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: "https://z-g.co.il/sitemap.xml",
  };
}
