import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Update header
  const header = await prisma.page.findUnique({ where: { slug: "header" }, select: { content: true } });
  const hc = header?.content as Record<string, unknown> | null;
  const navItems = hc?.navItems as Array<{ label: string; href: string }> | undefined;
  if (navItems && !navItems.some((i) => i.href === "/digital-services")) {
    const idx = navItems.findIndex((i) => i.href === "/contact");
    navItems.splice(idx, 0, { label: "שירותים דיגיטליים", href: "/digital-services" });
    await prisma.page.update({ where: { slug: "header" }, data: { content: { ...hc, navItems }, draftContent: { ...hc, navItems } } });
    console.log("Header updated");
  } else {
    console.log("Header: already has /digital-services or no navItems");
  }

  // Update footer
  const footer = await prisma.page.findUnique({ where: { slug: "footer" }, select: { content: true } });
  const fc = footer?.content as Record<string, unknown> | null;
  const quickLinks = fc?.quickLinks as Array<{ label: string; href: string }> | undefined;
  if (quickLinks && !quickLinks.some((i) => i.href === "/digital-services")) {
    const idx = quickLinks.findIndex((i) => i.href === "/contact");
    quickLinks.splice(idx, 0, { label: "שירותים דיגיטליים", href: "/digital-services" });
    await prisma.page.update({ where: { slug: "footer" }, data: { content: { ...fc, quickLinks }, draftContent: { ...fc, quickLinks } } });
    console.log("Footer updated");
  } else {
    console.log("Footer: already has /digital-services or no quickLinks");
  }

  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });
