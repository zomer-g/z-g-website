import { prisma } from "@/lib/prisma";

(async () => {
  // Police body-cameras protocol shown in the user's screenshot is docId 66969.
  const target = await prisma.guidelineChunk.findMany({
    where: { docId: 66969 },
    select: { chunkIdx: true, text: true },
    orderBy: { chunkIdx: "asc" },
  });
  console.log(`docId 66969: ${target.length} chunks`);
  for (const c of target.slice(0, 3)) {
    console.log(`  chunk ${c.chunkIdx} (${c.text.length} chars): ${c.text.slice(0, 200).replace(/\n/g, " | ")}`);
  }

  // How many chunks total reference "מצלמ" (any form) in their body? — to
  // see if the issue is that body cameras get discussed in many docs but
  // the indexer normalized them out, or whether they truly aren't there.
  const allRows = await prisma.guidelineChunk.findMany({ select: { docId: true, text: true } });
  const docsMentioningMatzlema = new Set<number>();
  for (const r of allRows) {
    if (r.text.includes("מצלמ")) docsMentioningMatzlema.add(r.docId);
  }
  console.log(`docs containing the stem "מצלמ" anywhere: ${docsMentioningMatzlema.size}`);

  // Also: is there a doc whose title (chunk 0) mentions "גוף" near "מצלמ"?
  const headers = await prisma.guidelineChunk.findMany({ where: { chunkIdx: 0 }, select: { docId: true, text: true } });
  const titleHits: { docId: number; title: string }[] = [];
  for (const h of headers) {
    if (h.text.includes("מצלמ") && h.text.includes("גוף")) {
      titleHits.push({ docId: h.docId, title: h.text.split("\n")[0].slice(0, 120) });
    }
  }
  console.log(`docs with both "מצלמ" and "גוף" in chunk 0 (title/topic/summary):`);
  for (const t of titleHits) console.log(`  ${t.docId}: ${t.title}`);

  // Total docs in the corpus.
  const distinctDocs = new Set<number>();
  for (const r of allRows) distinctDocs.add(r.docId);
  console.log(`distinct doc ids indexed: ${distinctDocs.size}`);

  await prisma.$disconnect();
})();
