/**
 * Fix plural references in DB content:
 * - "משרד עורכי דין זומר" → 'עו"ד זומר'
 * - "תחומי העיסוק שלנו" → "תחומי העיסוק"
 * - "השירותים שלנו" → "השירותים"
 * - "המשרד מספק" → 'עו"ד זומר מספק'
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const REPLACEMENTS: [string, string][] = [
  ["משרד עורכי דין זומר", 'עו"ד זומר'],
  ["משרד עורכי דין", 'עו"ד זומר'],
  ["תחומי העיסוק שלנו", "תחומי העיסוק"],
  ["השירותים שלנו", "השירותים"],
  ["הצוות שלנו", ""],
  ["צוות המשרד", 'עו"ד זומר'],
];

function deepReplace(obj: unknown): unknown {
  if (typeof obj === "string") {
    let result = obj;
    for (const [from, to] of REPLACEMENTS) {
      result = result.replaceAll(from, to);
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepReplace);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = deepReplace(value);
    }
    return result;
  }
  return obj;
}

async function main() {
  const pages = await prisma.page.findMany({ select: { id: true, slug: true, content: true } });

  let updated = 0;
  for (const page of pages) {
    if (!page.content) continue;
    const original = JSON.stringify(page.content);
    const fixed = deepReplace(page.content);
    const fixedStr = JSON.stringify(fixed);

    if (original !== fixedStr) {
      await prisma.page.update({
        where: { id: page.id },
        data: { content: fixed as Record<string, unknown> },
      });
      console.log(`Fixed: ${page.slug}`);
      updated++;
    }
  }

  // Also fix services
  const services = await prisma.service.findMany({ select: { id: true, slug: true, title: true, description: true, content: true } });
  for (const svc of services) {
    const origTitle = svc.title;
    const origDesc = svc.description;
    const origContent = JSON.stringify(svc.content);

    const newTitle = deepReplace(origTitle) as string;
    const newDesc = deepReplace(origDesc) as string;
    const newContent = deepReplace(svc.content);
    const newContentStr = JSON.stringify(newContent);

    if (origTitle !== newTitle || origDesc !== newDesc || origContent !== newContentStr) {
      await prisma.service.update({
        where: { id: svc.id },
        data: {
          title: newTitle,
          description: newDesc,
          content: newContent as Record<string, unknown>,
        },
      });
      console.log(`Fixed service: ${svc.slug}`);
      updated++;
    }
  }

  // Also fix posts
  const posts = await prisma.post.findMany({ select: { id: true, slug: true, title: true, excerpt: true, content: true } });
  for (const post of posts) {
    const origTitle = post.title;
    const origExcerpt = post.excerpt || "";
    const origContent = JSON.stringify(post.content);

    const newTitle = deepReplace(origTitle) as string;
    const newExcerpt = deepReplace(origExcerpt) as string;
    const newContent = deepReplace(post.content);
    const newContentStr = JSON.stringify(newContent);

    if (origTitle !== newTitle || origExcerpt !== newExcerpt || origContent !== newContentStr) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          title: newTitle,
          excerpt: newExcerpt || null,
          content: newContent as Record<string, unknown>,
        },
      });
      console.log(`Fixed post: ${post.slug}`);
      updated++;
    }
  }

  console.log(`\nDone! Updated ${updated} records.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
