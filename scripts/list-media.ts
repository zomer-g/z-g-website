import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
async function main() {
  const items = await prisma.mediaAppearance.findMany({
    orderBy: { order: "asc" },
    select: { id: true, title: true, url: true, source: true, type: true },
  });
  for (const item of items) {
    console.log(`[${item.id}] ${item.source} | ${item.title}`);
    console.log(`  URL: ${item.url || "none"}`);
    console.log("");
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
