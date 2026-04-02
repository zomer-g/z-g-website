import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const pages = [
  { slug: "legal-tools", title: "כלים משפטיים (ראשי)" },
  { slug: "legal-tools-privacy", title: "כלים משפטיים — פרטיות" },
  { slug: "legal-tools-terms", title: "כלים משפטיים — תנאי שימוש" },
  { slug: "legal-tools-support", title: "כלים משפטיים — תמיכה" },
];

async function main() {
  for (const { slug, title } of pages) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
      console.log(`Already exists: ${slug}`);
    } else {
      await prisma.page.create({
        data: {
          slug,
          title,
          content: {},
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
      console.log(`Created: ${slug}`);
    }
  }
  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });
