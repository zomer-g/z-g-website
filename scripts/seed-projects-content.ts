import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_PROJECTS_CONTENT } from "../src/lib/content-defaults";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.page.upsert({
    where: { slug: "projects" },
    create: {
      slug: "projects",
      title: "מיזמים",
      content: DEFAULT_PROJECTS_CONTENT as unknown as Record<string, unknown>,
      status: "PUBLISHED",
    },
    update: {
      content: DEFAULT_PROJECTS_CONTENT as unknown as Record<string, unknown>,
    },
  });
  console.log("Projects page content seeded");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
