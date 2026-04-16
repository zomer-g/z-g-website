import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Count what we're about to delete
  const preCount = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM sanegoria_cases WHERE acceptance_date < '2022-01-01' OR acceptance_date IS NULL
  `;
  console.log(`Cases with acceptance_date < 2022 or NULL: ${preCount[0].n}`);

  const totalCount = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM sanegoria_cases
  `;
  console.log(`Total cases before: ${totalCount[0].n}`);

  // 2. Get the case_ids to delete
  const oldCaseIds = await prisma.$queryRaw<{ case_id: string }[]>`
    SELECT case_id FROM sanegoria_cases WHERE acceptance_date < '2022-01-01' OR acceptance_date IS NULL
  `;
  console.log(`Fetched ${oldCaseIds.length} case_ids to delete`);

  if (oldCaseIds.length === 0) {
    console.log("Nothing to delete.");
    await prisma.$disconnect();
    return;
  }

  // 3. Delete related hearings and offenses in batches
  const caseIds = oldCaseIds.map(r => r.case_id);
  const BATCH = 1000;

  let deletedHearings = 0;
  let deletedOffenses = 0;

  for (let i = 0; i < caseIds.length; i += BATCH) {
    const batch = caseIds.slice(i, i + BATCH);
    const hr = await prisma.sanegoriaHearing.deleteMany({ where: { caseId: { in: batch } } });
    const or = await prisma.sanegoriaOffense.deleteMany({ where: { caseId: { in: batch } } });
    deletedHearings += hr.count;
    deletedOffenses += or.count;
    process.stdout.write(`\rProgress: ${Math.min(i + BATCH, caseIds.length)}/${caseIds.length} cases processed`);
  }
  console.log();
  console.log(`Deleted ${deletedHearings} hearings, ${deletedOffenses} offenses`);

  // 4. Delete the cases themselves
  const caseDel = await prisma.$executeRaw`
    DELETE FROM sanegoria_cases WHERE acceptance_date < '2022-01-01' OR acceptance_date IS NULL
  `;
  console.log(`Deleted ${caseDel} cases`);

  // 5. Report final counts
  const afterCount = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM sanegoria_cases
  `;
  console.log(`Total cases after: ${afterCount[0].n}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
