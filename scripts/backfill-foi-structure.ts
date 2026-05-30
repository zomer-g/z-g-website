// One-off: populate the structured law-section model for chapters already
// ingested, without re-running embeddings. Safe to re-run (replaces sections
// per chapter). After the structured-ingest path ships, the regular
// "סנכרן עכשיו" keeps it in sync; this is just for the initial backfill.
//
// Run: npx tsx scripts/backfill-foi-structure.ts

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { fetchHtml, parseChapter } from "../src/lib/foi-guide-crawler";
import { extractLawSections } from "../src/lib/foi-guide-structure";

async function main() {
  const docs = await prisma.foiGuideDoc.findMany({
    orderBy: { order: "asc" },
    select: { id: true, url: true, title: true },
  });
  console.log(`Backfilling structure for ${docs.length} chapters…`);

  let totalSections = 0;
  let totalExamples = 0;
  for (const doc of docs) {
    try {
      const html = await fetchHtml(doc.url);
      const parsed = parseChapter(html, doc.url);
      const sections = extractLawSections(html, doc.url, parsed.footnotes);

      await prisma.$transaction(async (tx) => {
        await tx.foiLawSection.deleteMany({ where: { docId: doc.id } });
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          await tx.foiLawSection.create({
            data: {
              sectionRef: s.sectionRef,
              heading: s.heading,
              anchorUrl: s.anchorUrl,
              docId: doc.id,
              chapterUrl: doc.url,
              order: i,
              examples: {
                create: s.examples.map((ex) => ({
                  description: ex.description,
                  outcome: ex.outcome,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  rulingsJson: ex.rulings as any,
                  order: ex.order,
                })),
              },
            },
          });
        }
      });

      const ex = sections.reduce((n, s) => n + s.examples.length, 0);
      totalSections += sections.length;
      totalExamples += ex;
      if (sections.length > 0) {
        console.log(
          `  [${doc.title.slice(0, 40)}] ${sections.length} sections, ${ex} examples`,
        );
      }
    } catch (err) {
      console.error(`  FAILED ${doc.title}:`, (err as Error).message);
    }
  }

  console.log(`\nDone. ${totalSections} sections, ${totalExamples} examples total.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
