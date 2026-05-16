/**
 * Replaces stored CMS content for the rebranded pages with the new defaults
 * from src/lib/content-defaults.ts.
 *
 * Usage:
 *   npx tsx scripts/apply-rebrand-defaults.ts            # dry-run (prints diff)
 *   npx tsx scripts/apply-rebrand-defaults.ts --apply    # writes and publishes
 *
 * Touches: home, about, header, footer, site-seo.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DEFAULT_HOME_CONTENT,
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_HEADER_CONTENT,
  DEFAULT_FOOTER_CONTENT,
  DEFAULT_SITE_SEO_CONTENT,
} from "../src/lib/content-defaults";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TARGETS: Array<{ slug: string; title: string; content: unknown }> = [
  { slug: "home", title: "דף הבית", content: DEFAULT_HOME_CONTENT },
  { slug: "about", title: "אודות", content: DEFAULT_ABOUT_CONTENT },
  { slug: "header", title: "כותרת עליונה", content: DEFAULT_HEADER_CONTENT },
  { slug: "footer", title: "כותרת תחתונה", content: DEFAULT_FOOTER_CONTENT },
  { slug: "site-seo", title: "SEO — האתר (גלובלי)", content: DEFAULT_SITE_SEO_CONTENT },
];

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "MODE: apply (writing to DB)" : "MODE: dry-run (no DB writes)");

  for (const { slug, title, content } of TARGETS) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
      console.log(`\n[${slug}] exists — will overwrite published + draft content`);
    } else {
      console.log(`\n[${slug}] not found — will create with defaults`);
    }
    if (!apply) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = content as any;
    if (existing) {
      await prisma.page.update({
        where: { slug },
        data: {
          content: data,
          draftContent: data,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    } else {
      await prisma.page.create({
        data: {
          slug,
          title,
          content: data,
          draftContent: data,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    }
    console.log(`[${slug}] updated`);
  }

  if (!apply) {
    console.log("\nDry-run complete. Re-run with --apply to write changes.");
  } else {
    console.log("\nDone.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
