import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Ensure projects page exists
  await prisma.page.upsert({
    where: { slug: "projects" },
    create: {
      slug: "projects",
      title: "מיזמים",
      content: {},
      status: "PUBLISHED",
    },
    update: {},
  });
  console.log("Projects page record created/verified");

  // Ensure terms page exists (may already exist from seed-legal-pages)
  const terms = await prisma.page.findUnique({ where: { slug: "terms" } });
  if (!terms) {
    await prisma.page.create({
      data: {
        slug: "terms",
        title: "תנאי שימוש",
        content: {},
        status: "PUBLISHED",
      },
    });
    console.log("Terms page record created");
  } else {
    console.log("Terms page already exists");
  }

  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });
