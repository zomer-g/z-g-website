import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Copy published content to draftContent for all pages
  const pages = await prisma.page.findMany({
    select: { slug: true, content: true, draftContent: true },
  });

  for (const page of pages) {
    if (page.content && JSON.stringify(page.content) !== JSON.stringify(page.draftContent)) {
      await prisma.page.update({
        where: { slug: page.slug },
        data: { draftContent: page.content },
      });
      console.log(`Synced draft: ${page.slug}`);
    }
  }

  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });
