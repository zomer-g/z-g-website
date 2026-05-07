import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { EXTENSION_PAGES_MANIFEST } from "../src/lib/extension-pages-manifest";

/**
 * Manual seeder for extension support pages.
 *
 * Most of the time you should not need to run this — /api/pages GET
 * calls ensureExtensionPagesExist() and bootstraps the rows the first
 * time the admin opens the pages list after a deploy.
 *
 * Use this script when you want to refresh existing rows with the
 * default manifest content (it overwrites title + content but
 * preserves the admin-set status, so a published page stays published).
 */

// Local PrismaClient — the manifest's prisma import resolves through
// "@/lib/prisma" which depends on Next path aliases that aren't available
// in a plain `tsx` script run, so we don't import it here.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const { slug, title, build } of EXTENSION_PAGES_MANIFEST) {
    const content = build();
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
      await prisma.page.update({
        where: { slug },
        data: { title, content },
      });
      console.log(`Updated content: ${slug} (status preserved: ${existing.status})`);
    } else {
      await prisma.page.create({
        data: {
          slug,
          title,
          content,
          status: "DRAFT",
        },
      });
      console.log(`Created (DRAFT): ${slug}`);
    }
  }
  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
