// Full local re-ingest of the FOI Guide (foiguide.org.il) into the prod DB.
// Mirrors src/app/api/admin/foi-guide/ingest/route.ts but with no soft
// deadline, so all chapters complete in one run. Used for the 2026 site
// redesign migration (new /chapter-N/ URLs + new footnote markup); safe to
// re-run any time — unchanged chapters are hash-skipped.
//
// Run: OPENAI_API_KEY=… npx tsx scripts/reingest-foi-guide.ts [--force]

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  embedTexts,
  hashText,
  EMBED_MODEL,
} from "../src/lib/openai-embeddings";
import {
  fetchHtml,
  fetchIndex,
  parseChapter,
  type CaseLawCitation,
} from "../src/lib/foi-guide-crawler";
import { chunkFoiChapter } from "../src/lib/foi-guide-chunker";
import { extractLawSections, type LawSection } from "../src/lib/foi-guide-structure";
import type { Prisma } from "../src/generated/prisma/client";

const EMBED_BATCH = 64;

async function persistStructure(
  tx: Prisma.TransactionClient,
  docId: number,
  chapterUrl: string,
  sections: LawSection[],
): Promise<number> {
  await tx.foiLawSection.deleteMany({ where: { docId } });
  let examples = 0;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    await tx.foiLawSection.create({
      data: {
        sectionRef: s.sectionRef,
        heading: s.heading,
        anchorUrl: s.anchorUrl,
        docId,
        chapterUrl,
        order: i,
        examples: {
          create: s.examples.map((ex) => ({
            description: ex.description,
            outcome: ex.outcome,
            rulingsJson: ex.rulings as unknown as object,
            order: ex.order,
          })),
        },
      },
    });
    examples += s.examples.length;
  }
  return examples;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  const force = process.argv.includes("--force");

  const index = await fetchIndex();
  console.log(`Index: ${index.length} chapters`);
  if (index.length < 15) throw new Error("Suspiciously small index — aborting");

  const existingDocs = await prisma.foiGuideDoc.findMany({
    select: { id: true, url: true, contentHash: true },
  });
  const existingByUrl = new Map(existingDocs.map((d) => [d.url, d]));

  let rebuilt = 0;
  let skipped = 0;
  let failed = 0;

  for (const ref of index) {
    try {
      const html = await fetchHtml(ref.url);
      const parsed = parseChapter(html, ref.url);
      const chunks = chunkFoiChapter({
        title: ref.title || parsed.title,
        slug: ref.slug,
        url: ref.url,
        parsed,
      });
      if (chunks.length === 0) {
        console.log(`  ~ ${ref.title}: no chunks, skipped`);
        skipped++;
        continue;
      }

      const sections = extractLawSections(html, ref.url, parsed.footnotes);
      const contentHash = await hashText(
        `${EMBED_MODEL}\n${chunks.map((c) => c.embeddingInput).join("\n---\n")}`,
      );
      const prior = existingByUrl.get(ref.url);
      if (!force && prior?.contentHash === contentHash) {
        await prisma.$transaction(async (tx) => {
          await tx.foiGuideDoc.update({
            where: { id: prior.id },
            data: { lastFetchedAt: new Date() },
          });
          await persistStructure(tx, prior.id, ref.url, sections);
        });
        console.log(`  = ${ref.title}: unchanged (structure refreshed)`);
        skipped++;
        continue;
      }

      const embeddings = new Map<number, number[]>();
      for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
        const batch = chunks.slice(i, i + EMBED_BATCH);
        const vectors = await embedTexts(batch.map((b) => b.embeddingInput));
        batch.forEach((b, idx) => embeddings.set(b.index, vectors[idx]));
      }

      const caseLawJson: CaseLawCitation[] = parsed.footnotes.filter(
        (f) => f.isCaseLaw,
      );
      const textChars = chunks.reduce((s, c) => s + c.text.length, 0);

      await prisma.$transaction(async (tx) => {
        let id: number;
        if (prior) {
          await tx.foiGuideChunk.deleteMany({ where: { docId: prior.id } });
          await tx.foiGuideDoc.update({
            where: { id: prior.id },
            data: {
              slug: ref.slug,
              url: ref.url,
              title: ref.title || parsed.title,
              order: ref.order,
              contentHash,
              textChars,
              chunkCount: chunks.length,
              caseLawJson: caseLawJson as unknown as object,
              lastFetchedAt: new Date(),
            },
          });
          id = prior.id;
        } else {
          const created = await tx.foiGuideDoc.create({
            data: {
              slug: ref.slug,
              url: ref.url,
              title: ref.title || parsed.title,
              order: ref.order,
              contentHash,
              textChars,
              chunkCount: chunks.length,
              caseLawJson: caseLawJson as unknown as object,
              lastFetchedAt: new Date(),
            },
          });
          id = created.id;
        }

        await tx.foiGuideChunk.createMany({
          data: chunks.map((c) => ({
            docId: id,
            chunkIdx: c.index,
            text: c.text,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            embedding: embeddings.get(c.index) as any,
            model: EMBED_MODEL,
            section: c.section,
          })),
        });

        const ex = await persistStructure(tx, id, ref.url, sections);
        console.log(
          `  ✓ ${ref.title}: ${chunks.length} chunks, ` +
            `${sections.length} sections / ${ex} examples, ` +
            `${caseLawJson.length} case-law footnotes`,
        );
      });
      rebuilt++;
    } catch (err) {
      failed++;
      console.error(`  ✗ ${ref.title}:`, err);
    }
  }

  // Prune docs whose URL vanished from the live index (pre-redesign URLs).
  if (failed === 0) {
    const liveUrls = new Set(index.map((r) => r.url));
    const staleIds = existingDocs
      .filter((d) => !liveUrls.has(d.url))
      .map((d) => d.id);
    if (staleIds.length > 0) {
      await prisma.$transaction([
        prisma.foiLawSection.deleteMany({ where: { docId: { in: staleIds } } }),
        prisma.foiGuideDoc.deleteMany({ where: { id: { in: staleIds } } }),
      ]);
      console.log(`Pruned ${staleIds.length} stale docs (old URLs)`);
    }
  } else {
    console.log("Skipping prune — there were failures");
  }

  console.log(`Done. rebuilt=${rebuilt} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
