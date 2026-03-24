/**
 * CLI tool: Create a MediaAppearance (and optionally a blog Post) from a URL.
 *
 * Usage:
 *   npx tsx scripts/url-to-post.ts <url> [--type video|article|podcast] [--post]
 *
 * Examples:
 *   npx tsx scripts/url-to-post.ts https://example.com/article
 *   npx tsx scripts/url-to-post.ts https://youtube.com/watch?v=abc --type video
 *   npx tsx scripts/url-to-post.ts https://example.com/news --post
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/* ─── HTML metadata extraction ─── */

function extractMeta(html: string, property: string): string | null {
  // Try og: / article: meta tags
  const ogMatch = html.match(
    new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
  );
  if (ogMatch) return ogMatch[1];
  // Try reversed attribute order
  const reversed = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
      "i",
    ),
  );
  if (reversed) return reversed[1];
  return null;
}

function extractTitle(html: string): string {
  return (
    extractMeta(html, "og:title") ||
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
    "Untitled"
  );
}

function extractDescription(html: string): string {
  return (
    extractMeta(html, "og:description") ||
    extractMeta(html, "description") ||
    ""
  );
}

function extractSiteName(html: string, url: string): string {
  const ogSite = extractMeta(html, "og:site_name");
  if (ogSite) return ogSite;
  // Derive from domain
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const domainMap: Record<string, string> = {
      "themarker.com": "TheMarker",
      "haaretz.co.il": "הארץ",
      "globes.co.il": "גלובס",
      "calcalist.co.il": "כלכליסט",
      "ynet.co.il": "Ynet",
      "mako.co.il": "mako",
      "13tv.co.il": "חדשות 13",
      "kan.org.il": "כאן",
      "news.walla.co.il": "וואלה",
      "walla.co.il": "וואלה",
      "ice.co.il": "ICE",
      "law.co.il": "law.co.il",
      "the7eye.org.il": "העין השביעית",
      "shomrim.news": "שומרים",
      "ha-makom.co.il": "המקום הכי חם בגיהנום",
      "youtube.com": "YouTube",
    };
    return domainMap[hostname] || hostname;
  } catch {
    return "Unknown";
  }
}

function extractDate(html: string, url: string): string {
  // Try meta tags
  const articleDate =
    extractMeta(html, "article:published_time") ||
    extractMeta(html, "datePublished") ||
    extractMeta(html, "publish_date");
  if (articleDate) {
    const d = new Date(articleDate);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  // Try extracting date from URL path
  const urlDateMatch = url.match(/(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (urlDateMatch) return `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`;
  // Fallback to today
  return new Date().toISOString().split("T")[0];
}

function detectType(
  url: string,
  override?: string,
): "video" | "article" | "podcast" {
  if (override && ["video", "article", "podcast"].includes(override)) {
    return override as "video" | "article" | "podcast";
  }
  const hostname = new URL(url).hostname.toLowerCase();
  if (
    hostname.includes("youtube") ||
    hostname.includes("vimeo") ||
    hostname.includes("13tv") ||
    hostname.includes("mako.co.il") ||
    url.includes("/video/")
  ) {
    return "video";
  }
  if (
    hostname.includes("spotify") ||
    hostname.includes("podcasts.apple") ||
    hostname.includes("anchor.fm") ||
    url.includes("/podcast/")
  ) {
    return "podcast";
  }
  return "article";
}

/* ─── TipTap JSON helpers ─── */

interface TTNode {
  type: string;
  content?: TTNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function textToTipTap(text: string): TTNode {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: [{ type: "text", text: p }],
    })),
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/* ─── Main ─── */

async function main() {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith("--"));
  const typeOverride = args
    .find((a) => a.startsWith("--type"))
    ?.split("=")[1] ||
    (args.indexOf("--type") !== -1
      ? args[args.indexOf("--type") + 1]
      : undefined);
  const createPost = args.includes("--post");

  if (!url) {
    console.log(`
Usage: npx tsx scripts/url-to-post.ts <url> [--type video|article|podcast] [--post]

Options:
  <url>              URL to import
  --type <type>      Override auto-detected type (video, article, podcast)
  --post             Also create a blog Post (DRAFT) from the content
`);
    process.exit(1);
  }

  console.log(`Fetching: ${url}`);

  // Fetch the page
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await res.text();
  } catch (e: unknown) {
    console.error(`Failed to fetch URL: ${(e as Error).message}`);
    process.exit(1);
  }

  // Extract metadata
  const title = extractTitle(html);
  const description = extractDescription(html);
  const source = extractSiteName(html, url);
  const date = extractDate(html, url);
  const type = detectType(url, typeOverride);

  console.log(`\nExtracted:`);
  console.log(`  Title:       ${title}`);
  console.log(`  Description: ${description.substring(0, 80)}${description.length > 80 ? "..." : ""}`);
  console.log(`  Source:      ${source}`);
  console.log(`  Date:        ${date}`);
  console.log(`  Type:        ${type}`);

  // Check for duplicate
  const existing = await prisma.mediaAppearance.findFirst({
    where: { url },
  });
  if (existing) {
    console.log(`\nMedia appearance already exists (id: ${existing.id}). Updating...`);
    await prisma.mediaAppearance.update({
      where: { id: existing.id },
      data: { title, description, type, source, date, isActive: true },
    });
    console.log("Updated successfully.");
  } else {
    // Get next order number
    const maxOrder = await prisma.mediaAppearance.aggregate({
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? 0) + 1;

    const created = await prisma.mediaAppearance.create({
      data: { title, description, type, source, date, url, order, isActive: true },
    });
    console.log(`\nCreated MediaAppearance (id: ${created.id})`);
  }

  // Optionally create a blog Post
  if (createPost) {
    console.log("\nCreating blog Post (DRAFT)...");

    const slug = slugify(title);
    const existingPost = await prisma.post.findUnique({ where: { slug } });
    if (existingPost) {
      console.log(`  Post with slug "${slug}" already exists. Skipping.`);
    } else {
      // Find author
      const author = await prisma.user.findFirst();
      if (!author) {
        console.log("  No user found in database. Cannot create post.");
      } else {
        const content = textToTipTap(
          description || title,
        ) as unknown as Record<string, unknown>;

        const post = await prisma.post.create({
          data: {
            title,
            slug,
            content,
            excerpt: description.substring(0, 200) || null,
            status: "DRAFT",
            category: "מדיה",
            authorId: author.id,
          },
        });
        console.log(`  Created Post (id: ${post.id}, slug: ${slug})`);
      }
    }
  }

  await prisma.$disconnect();
  console.log("\nDone!");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
