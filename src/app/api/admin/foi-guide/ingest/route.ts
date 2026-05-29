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
  const existingDocs = await prisma.foiGuideDoc.findMany({
    select: { id: true, slug: true, contentHash: true },
  });
  const existingBySlug = new Map(existingDocs.map((d) => [d.slug, d]));

  const stats = {
    total: index.length,
    fetched: 0,
    skipped: 0,
    rebuilt: 0,
    chunksCreated: 0,
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

      const contentHash = await hashText(
        `${EMBED_MODEL}\n${chunks.map((c) => c.embeddingInput).join("\n---\n")}`,
      );
      const prior = existingBySlug.get(ref.slug);
      if (!force && prior?.contentHash === contentHash) {
        // Touch lastFetchedAt so the admin UI can show "checked X minutes ago"
        // even on a no-op cycle.
        await prisma.foiGuideDoc.update({
          where: { id: prior.id },
          data: { lastFetchedAt: new Date() },
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
