import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const bySource = await prisma.caRecord.groupBy({ by: ["source"], _count: true });
  console.log("counts:", JSON.stringify(bySource));
  const meta = await prisma.caSync.findUnique({ where: { id: "singleton" } });
  console.log("meta:", JSON.stringify(meta));
}
main().finally(() => prisma.$disconnect());
