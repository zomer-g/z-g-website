import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
async function main() {
  const page = await prisma.page.findUnique({ where: { slug: "about" }, select: { content: true } });
  console.log(JSON.stringify(page?.content, null, 2));
  await prisma.$disconnect();
}
main();
