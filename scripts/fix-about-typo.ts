import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BAD = "טגנולוגיה";
const GOOD = "טכנולוגיה";

function fix<T>(value: T): { value: T; count: number } {
  const json = JSON.stringify(value);
  const replaced = json.split(BAD).join(GOOD);
  const count = json.split(BAD).length - 1;
  return { value: JSON.parse(replaced) as T, count };
}

async function main() {
  const page = await prisma.page.findUnique({
    where: { slug: "about" },
    select: { content: true, draftContent: true },
  });
  if (!page) throw new Error("about page not found");

  const c = fix(page.content);
  const d = page.draftContent ? fix(page.draftContent) : { value: undefined, count: 0 };

  if (c.count === 0 && d.count === 0) {
    console.log("No occurrences of the typo found — nothing to do.");
    await prisma.$disconnect();
    return;
  }

  await prisma.page.update({
    where: { slug: "about" },
    data: {
      content: c.value as any,
      ...(d.value !== undefined ? { draftContent: d.value as any } : {}),
    },
  });

  console.log(`Fixed typo. content: ${c.count} occurrence(s), draft: ${d.count} occurrence(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
