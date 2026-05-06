import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DESIRED_ORDER = [
  "/",
  "/about",
  "/digital-services",
  "/projects",
  "/services",
  "/media",
  "/articles",
  "/contact",
];

async function reorder(slug: string) {
  const row = await prisma.page.findUnique({
    where: { slug },
    select: { content: true, draftContent: true },
  });
  if (!row) {
    console.log(`No ${slug} row.`);
    return;
  }

  const reorderItems = (items: Array<{ label: string; href: string }>) => {
    const byHref = new Map(items.map((i) => [i.href, i]));
    const ordered: Array<{ label: string; href: string }> = [];
    for (const href of DESIRED_ORDER) {
      const it = byHref.get(href);
      if (it) {
        ordered.push(it);
        byHref.delete(href);
      }
    }
    for (const leftover of byHref.values()) ordered.push(leftover);
    return ordered;
  };

  const apply = (c: Record<string, unknown> | null | undefined) => {
    if (!c) return c;
    const items = c.navItems as Array<{ label: string; href: string }> | undefined;
    if (!items) return c;
    return { ...c, navItems: reorderItems(items) };
  };

  const newContent = apply(row.content as Record<string, unknown> | null);
  const newDraft = apply(row.draftContent as Record<string, unknown> | null);

  await prisma.page.update({
    where: { slug },
    data: {
      content: newContent ?? undefined,
      draftContent: newDraft ?? undefined,
    },
  });
  console.log(`${slug}: navItems reordered →`);
  console.log((newContent as { navItems: Array<{ label: string }> }).navItems.map((i) => i.label).join(" · "));
}

async function main() {
  await reorder("header");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
