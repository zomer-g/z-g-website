/**
 * Generate branded thumbnail images for media appearances.
 * Creates an image with the source name + article title on a branded background.
 * No copyright issues since it's 100% generated content.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Source brand colors
const SOURCE_COLORS: Record<string, { bg: string; accent: string }> = {
  // Researched from actual site headers/branding
  TheMarker: { bg: "#028759", accent: "#ffffff" },
  "הארץ": { bg: "#226EE9", accent: "#ffffff" },
  "גלובס": { bg: "#97133F", accent: "#ffffff" },
  "כלכליסט": { bg: "#FF0000", accent: "#ffffff" },
  ICE: { bg: "#282835", accent: "#0275D8" },
  "שומרים": { bg: "#293E57", accent: "#107B83" },
  "רשת 13": { bg: "#011D6B", accent: "#EB0000" },
  "וואלה": { bg: "#363636", accent: "#066BED" },
  "העין השביעית": { bg: "#EF2A33", accent: "#ffffff" },
  "רשות הרבים": { bg: "#150B47", accent: "#D3B574" },
  "law.co.il": { bg: "#2F3847", accent: "#1779BA" },
  "המקום הכי חם בגיהנום": { bg: "#212121", accent: "#F70D28" },
  "התמנון": { bg: "#3F0202", accent: "#AA03C3" },
};

const DEFAULT_COLORS = { bg: "#1a365d", accent: "#c9a84c" };

function getColors(source: string) {
  return SOURCE_COLORS[source] || DEFAULT_COLORS;
}

async function generateThumbnail(
  source: string,
  title: string,
  filename: string,
): Promise<string> {
  const { bg, accent } = getColors(source);
  const width = 800;
  const height = 420;

  // Truncate title if too long
  const maxChars = 80;
  const displayTitle =
    title.length > maxChars ? title.substring(0, maxChars) + "..." : title;

  // Create SVG with embedded text
  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${bg};stop-opacity:0.85" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)" />

  <!-- Accent stripe -->
  <rect x="0" y="0" width="${width}" height="6" fill="${accent}" />

  <!-- Decorative dots -->
  <circle cx="60" cy="60" r="40" fill="${accent}" opacity="0.08" />
  <circle cx="${width - 80}" cy="${height - 80}" r="60" fill="${accent}" opacity="0.06" />

  <!-- Source name -->
  <text x="${width / 2}" y="100" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700"
    fill="${accent}">${escapeXml(source)}</text>

  <!-- Divider line -->
  <rect x="${width / 2 - 40}" y="120" width="80" height="3" rx="1.5" fill="${accent}" opacity="0.5" />

  <!-- Title text (wrapped) -->
  ${wrapText(displayTitle, width - 100, height)}

  <!-- Bottom bar -->
  <rect x="0" y="${height - 4}" width="${width}" height="4" fill="${accent}" opacity="0.3" />
</svg>`;

  const outputPath = path.join(UPLOADS_DIR, filename);
  await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(outputPath);

  return `/uploads/${filename}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxWidth: number, svgHeight: number): string {
  // Approximate character width for Arial at 24px
  const charWidth = 12;
  const lineHeight = 38;
  const maxCharsPerLine = Math.floor(maxWidth / charWidth);
  const startY = 175;

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Limit to 4 lines max
  const maxLines = 4;
  const displayLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    displayLines[maxLines - 1] += "...";
  }

  return displayLines
    .map(
      (line, i) =>
        `<text x="${maxWidth / 2 + 50}" y="${startY + i * lineHeight}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600"
      fill="#ffffff" direction="rtl">${escapeXml(line)}</text>`,
    )
    .join("\n  ");
}

async function main() {
  // Ensure uploads dir exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const items = await prisma.mediaAppearance.findMany({
    orderBy: { order: "asc" },
  });

  console.log(`Found ${items.length} media appearances\n`);

  let updated = 0;
  const forceRegenerate = process.argv.includes("--force");

  for (const item of items) {
    if (item.thumbnailUrl && !forceRegenerate) {
      console.log(`  Skip: ${item.title} (already has thumbnail)`);
      continue;
    }

    const filename = `media-thumb-${item.id}.png`;
    const url = await generateThumbnail(item.source, item.title, filename);

    await prisma.mediaAppearance.update({
      where: { id: item.id },
      data: { thumbnailUrl: url },
    });

    console.log(`  ✓ ${item.source}: ${item.title.substring(0, 50)}...`);
    updated++;
  }

  console.log(`\nDone! Generated ${updated} thumbnails.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
