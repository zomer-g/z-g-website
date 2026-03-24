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
  TheMarker: { bg: "#1a1a1a", accent: "#f5c518" },
  "הארץ": { bg: "#1a1a2e", accent: "#e94560" },
  "גלובס": { bg: "#003366", accent: "#ff6600" },
  "כלכליסט": { bg: "#c41e3a", accent: "#ffffff" },
  ICE: { bg: "#0a2463", accent: "#3e92cc" },
  "שומרים": { bg: "#2d3436", accent: "#00b894" },
  "רשת 13": { bg: "#1e3799", accent: "#ffffff" },
  "וואלה": { bg: "#e55039", accent: "#ffffff" },
  "העין השביעית": { bg: "#2c3e50", accent: "#f39c12" },
  "רשות הרבים": { bg: "#34495e", accent: "#1abc9c" },
  "law.co.il": { bg: "#2c3e50", accent: "#3498db" },
  "המקום הכי חם בגיהנום": { bg: "#c0392b", accent: "#f1c40f" },
  "התמנון": { bg: "#8e44ad", accent: "#f1c40f" },
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
  for (const item of items) {
    if (item.thumbnailUrl) {
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
