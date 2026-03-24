import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pages = [
    { slug: "privacy", title: "מדיניות פרטיות" },
    { slug: "accessibility", title: "הצהרת נגישות" },
    { slug: "terms", title: "תנאי שימוש" },
  ];

  for (const { slug, title } of pages) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
      console.log(`Already exists: ${slug}`);
    } else {
      await prisma.page.create({
        data: { slug, title, content: {}, status: "PUBLISHED" },
      });
      console.log(`Created: ${slug}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
