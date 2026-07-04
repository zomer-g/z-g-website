import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  embedTexts,
  hashText,
  EMBED_MODEL,
  OpenAIEmbeddingsError,
} from "@/lib/openai-embeddings";
import {
  fetchHtml,
  fetchIndex,
  parseChapter,
  type CaseLawCitation,
  type ChapterRef,
} from "@/lib/foi-guide-crawler";
import { chunkFoiChapter } from "@/lib/foi-guide-chunker";
import { extractLawSections, type LawSection } from "@/lib/foi-guide-structure";
import type { Prisma } from "@/generated/prisma/client";

// Persists the structured law-section → decided-example model for one chapter.
// Cheap (no API calls), so it runs on every fetched chapter — including the
// hash-skip path — to guarantee the structure stays in sync even when the
// embeddings are unchanged. Replaces the chapter's sections wholesale inside
// the caller's transaction.
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

// Mirrors the Guidelines embed route's incremental-rebuild design: per-doc
// content hash → skip unchanged chapters; embed in batched OpenAI calls;
// soft-deadline so a Render-timed-out invocation can be resumed by re-clicking
// "סנכרן עכשיו" in the admin panel.

const EMBED_BATCH = 64;
const SOFT_DEADLINE_MS = 75_000;

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const session = await auth();
  if (session?.user?.role === "ADMIN") return true;
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get("x-cron-secret") === expected) return true;
  return false;
}

interface PendingEmbed {
  slug: string;
  chunkIdx: number;
  text: string;
  embeddingInput: string;
  section: string;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 },
    );
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const startedAt = Date.now();

  // 1. Fetch the index to learn what chapters exist on the live site.
  let index: ChapterRef[];
  try {
    index = await fetchIndex();
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch FOI Guide index: ${(err as Error).message}` },
      { status: 502 },
    );
  }
  if (index.length === 0) {
    return NextResponse.json(
      { error: "Index returned zero chapters" },
      { status: 502 },
    );
  }

  // 2. Load existing per-doc state so unchanged chapters are skipped cheaply.
  //    Look up by URL (the authoritative key) — two chapters on foiguide.org.il
  //    can share the same last-segment slug because of source-site URL
  //    aliasing, so URL is the only safe match.
  const existingDocs = await prisma.foiGuideDoc.findMany({
    select: { id: true, url: true, contentHash: true },
  });
  const existingByUrl = new Map(existingDocs.map((d) => [d.url, d]));

  const stats = {
    total: index.length,
    fetched: 0,
    skipped: 0,
    rebuilt: 0,
    chunksCreated: 0,
    sectionsCreated: 0,
    examplesCreated: 0,
    prunedDocs: 0,
    failed: 0,
    failedSlugs: [] as string[],
    firstError: null as { slug: string; message: string } | null,
  };

  let stoppedEarly = false;

  for (const ref of index) {
    if (Date.now() - startedAt > SOFT_DEADLINE_MS) {
      stoppedEarly = true;
      break;
    }

    try {
      const html = await fetchHtml(ref.url);
      stats.fetched += 1;
      const parsed = parseChapter(html, ref.url);
      const chunks = chunkFoiChapter({
        title: ref.title || parsed.title,
        slug: ref.slug,
        url: ref.url,
        parsed,
      });
      if (chunks.length === 0) {
        stats.skipped += 1;
        continue;
      }

      // Structured law-section model — cheap (no API), so extract it for every
      // fetched chapter.
      const sections = extractLawSections(html, ref.url, parsed.footnotes);

      const contentHash = await hashText(
        `${EMBED_MODEL}\n${chunks.map((c) => c.embeddingInput).join("\n---\n")}`,
      );
      const prior = existingByUrl.get(ref.url);
      if (!force && prior?.contentHash === contentHash) {
        // Embeddings unchanged — skip the expensive rebuild, but still refresh
        // the structured sections (cheap) so this feature populates even when
        // the chapter text hasn't changed since the last ingest.
        await prisma.$transaction(async (tx) => {
          await tx.foiGuideDoc.update({
            where: { id: prior.id },
            data: { lastFetchedAt: new Date() },
          });
          const ex = await persistStructure(tx, prior.id, ref.url, sections);
          stats.sectionsCreated += sections.length;
          stats.examplesCreated += ex;
        });
        stats.skipped += 1;
        continue;
      }

      // Embed all chunks for this chapter, then commit atomically.
      const pending: PendingEmbed[] = chunks.map((c) => ({
        slug: ref.slug,
        chunkIdx: c.index,
        text: c.text,
        embeddingInput: c.embeddingInput,
        section: c.section,
      }));

      const embeddings = new Map<number, number[]>();
      for (let i = 0; i < pending.length; i += EMBED_BATCH) {
        const batch = pending.slice(i, i + EMBED_BATCH);
        const vectors = await embedTexts(batch.map((b) => b.embeddingInput));
        batch.forEach((b, idx) => embeddings.set(b.chunkIdx, vectors[idx]));
      }

      const caseLawJson: CaseLawCitation[] = parsed.footnotes.filter(
        (f) => f.isCaseLaw,
      );
      const textChars = chunks.reduce((s, c) => s + c.text.length, 0);

      const docId = prior?.id;

      await prisma.$transaction(async (tx) => {
        let id: number;
        if (docId) {
          await tx.foiGuideChunk.deleteMany({ where: { docId } });
          await tx.foiGuideDoc.update({
            where: { id: docId },
            data: {
              // Update the slug too — older rows may have been written with
              // the last-segment-only slug strategy that wasn't unique.
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
          id = docId;
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
          data: pending.map((p) => ({
            docId: id,
            chunkIdx: p.chunkIdx,
            text: p.text,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            embedding: embeddings.get(p.chunkIdx) as any,
            model: EMBED_MODEL,
            section: p.section,
          })),
        });

        const ex = await persistStructure(tx, id, ref.url, sections);
        stats.sectionsCreated += sections.length;
        stats.examplesCreated += ex;
      });

      stats.rebuilt += 1;
      stats.chunksCreated += chunks.length;
    } catch (err) {
      stats.failed += 1;
      stats.failedSlugs.push(ref.slug);
      const message =
        err instanceof OpenAIEmbeddingsError
          ? `openai ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      if (!stats.firstError) {
        stats.firstError = { slug: ref.slug, message };
      }
      console.error(`FOI Guide ingest failed for ${ref.slug}:`, err);
    }
  }

  // Prune docs whose URL no longer appears in the live index (the 2026 site
  // redesign moved chapters to /chapter-N/ URLs) — stale rows would keep
  // serving dead links and duplicate content through the MCP. Only prune on
  // a COMPLETE pass: a soft-deadline stop hasn't seen every live chapter, and
  // the index itself was validated non-empty above.
  if (!stoppedEarly && stats.failed === 0) {
    const liveUrls = new Set(index.map((r) => r.url));
    const staleIds = existingDocs
      .filter((d) => !liveUrls.has(d.url))
      .map((d) => d.id);
    if (staleIds.length > 0) {
      await prisma.$transaction([
        // FoiLawSection has no FK relation to the doc — delete explicitly
        // (its examples cascade); chunks cascade from the doc delete.
        prisma.foiLawSection.deleteMany({ where: { docId: { in: staleIds } } }),
        prisma.foiGuideDoc.deleteMany({ where: { id: { in: staleIds } } }),
      ]);
      stats.prunedDocs = staleIds.length;
    }
  }

  return NextResponse.json({
    ...stats,
    durationMs: Date.now() - startedAt,
    forced: force,
    stoppedEarly,
    note: stoppedEarly
      ? "הריצה נעצרה על-ידי בודק הזמן הרך. הרץ שוב כדי להמשיך."
      : undefined,
  });
}
