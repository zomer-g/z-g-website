import { NextResponse } from "next/server";
import { documentChunks, documentSitemap } from "@/lib/sitemap-documents";

/**
 * Document sitemaps, one slice per URL: /sitemap-docs/0.xml … /sitemap-docs/5.xml
 *
 * These are separate routes rather than Next's `generateSitemaps()` because
 * that convention moves the main sitemap to /sitemap/{id}.xml and leaves
 * /sitemap.xml — the URL robots.txt has always pointed at, and the one Google
 * already knows — returning a 404 page. Losing the known sitemap to gain the
 * document ones would be a bad trade. Both now exist, and robots.txt lists
 * every one of them.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function xml(urls: { url: string; lastModified?: Date | string }[]): string {
  const body = urls
    .map((u) => {
      const last = u.lastModified
        ? `<lastmod>${new Date(u.lastModified).toISOString().slice(0, 10)}</lastmod>`
        : "";
      // The titles these point at are Hebrew, but the URLs are numeric ids —
      // no escaping beyond the ampersand is needed, and there are none.
      return `<url><loc>${u.url}</loc>${last}<changefreq>yearly</changefreq><priority>0.5</priority></url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const index = Number(id.replace(/\.xml$/, ""));
  if (!Number.isInteger(index) || index < 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const chunks = await documentChunks();
  if (index >= chunks.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const entries = await documentSitemap(index);
  return new NextResponse(xml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Sitemaps are read by crawlers, not people; an hour of caching keeps a
      // 10,000-row query off the critical path without going stale in any way
      // that matters.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
