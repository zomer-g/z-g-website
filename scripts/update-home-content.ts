import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_HOME_CONTENT } from "../src/lib/content-defaults";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Update the home page with new content defaults
  await prisma.page.update({
    where: { slug: "home" },
    data: {
      content: DEFAULT_HOME_CONTENT as unknown as Record<string, unknown>,
      draftContent: DEFAULT_HOME_CONTENT as unknown as Record<string, unknown>,
    },
  });
  console.log("Home page content updated (both published and draft)");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
