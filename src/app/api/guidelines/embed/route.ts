import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  embedTexts,
  hashText,
  truncateForEmbedding,
  EMBED_MODEL,
  OpenAIEmbeddingsError,
} from "@/lib/openai-embeddings";
import { invalidateEmbeddingsCache } from "@/lib/guidelines-embeddings";

const UPSTREAM_BASE = "https://tag-it.biz/api/public/over-guidelines/documents";
const UPSTREAM_LIMIT = 500;

// Tune for OpenAI request-size limits and our own memory ceiling.
const EMBED_BATCH = 32;

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface UpstreamListItem {
  id: number;
  document_title?: string;
  topic?: string | null;
  summary?: string | null;
}

interface UpstreamSingleDoc extends UpstreamListItem {
  content_text?: string | null;
  has_text?: boolean;
}

function getUpstreamApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const session = await auth();
  if (session?.user?.id) return true;

  // Cron / unattended path: shared secret in header.
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get("x-cron-secret") === expected) return true;

  return false;
}

function buildEmbeddingInput(doc: UpstreamSingleDoc): string {
  const parts: string[] = [];
  if (doc.document_title) parts.push(doc.document_title);
  if (doc.topic) parts.push(doc.topic);
  if (doc.summary) parts.push(doc.summary);
  if (doc.content_text) parts.push(doc.content_text);
  return truncateForEmbedding(parts.filter(Boolean).join("\n\n"));
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const apiKey = getUpstreamApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Upstream API key not configured" },
      { status: 503 },
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 },
    );
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const startedAt = Date.now();

  // 1. List all guideline ids.
  const listRes = await fetch(`${UPSTREAM_BASE}?limit=${UPSTREAM_LIMIT}&skip=0`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  if (!listRes.ok) {
    return NextResponse.json(
      { error: `Upstream list failed: ${listRes.status}` },
      { status: 502 },
    );
  }
  const listJson = (await listRes.json()) as { items?: UpstreamListItem[] };
  const items = listJson.items || [];
  const ids = items.map((it) => it.id);

  // 2. Load existing hashes so we can skip unchanged docs unless force=1.
  const existingRows = await prisma.guidelineEmbedding.findMany({
    where: { id: { in: ids } },
    select: { id: true, contentHash: true },
  });
  const existingHash = new Map(existingRows.map((r) => [r.id, r.contentHash]));

  // 3. Fetch full text for each doc, decide which need re-embedding.
  // 8 parallel upstream calls keeps us polite while staying well under the 5-min budget.
  const PARALLEL = 8;
  type Pending = { id: number; hash: string; input: string };
  const pending: Pending[] = [];
  const stats = {
    total: ids.length,
    skipped: 0,
    fetched: 0,
    needsEmbedding: 0,
    embedded: 0,
    embeddingBatches: 0,
    failed: 0,
    failedIds: [] as number[],
  };

  for (let i = 0; i < ids.length; i += PARALLEL) {
    const slice = ids.slice(i, i + PARALLEL);
    await Promise.all(
      slice.map(async (id) => {
        try {
          const res = await fetch(`${UPSTREAM_BASE}/${id}`, {
            headers: { "X-API-Key": apiKey, Accept: "application/json" },
            cache: "no-store",
          });
          if (!res.ok) {
            stats.failed += 1;
            stats.failedIds.push(id);
            return;
          }
          stats.fetched += 1;
          const doc = (await res.json()) as UpstreamSingleDoc;
          const input = buildEmbeddingInput(doc);
          if (input.trim().length === 0) {
            stats.skipped += 1;
            return;
          }
          const h = await hashText(`${EMBED_MODEL}\n${input}`);
          if (!force && existingHash.get(id) === h) {
            stats.skipped += 1;
            return;
          }
          pending.push({ id, hash: h, input });
        } catch {
          stats.failed += 1;
          stats.failedIds.push(id);
        }
      }),
    );
  }

  stats.needsEmbedding = pending.length;

  // 4. Batch the OpenAI calls.
  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    try {
      const vectors = await embedTexts(batch.map((b) => b.input));
      stats.embeddingBatches += 1;
      // 5. Upsert into Postgres.
      await Promise.all(
        batch.map((b, idx) =>
          prisma.guidelineEmbedding.upsert({
            where: { id: b.id },
            update: {
              contentHash: b.hash,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              embedding: vectors[idx] as any,
              model: EMBED_MODEL,
              textChars: b.input.length,
            },
            create: {
              id: b.id,
              contentHash: b.hash,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              embedding: vectors[idx] as any,
              model: EMBED_MODEL,
              textChars: b.input.length,
            },
          }),
        ),
      );
      stats.embedded += batch.length;
    } catch (err) {
      stats.failed += batch.length;
      stats.failedIds.push(...batch.map((b) => b.id));
      if (err instanceof OpenAIEmbeddingsError) {
        console.error("OpenAI embedding failed:", err.status, err.message);
      } else {
        console.error("Embedding batch failed:", err);
      }
      // Keep going with next batches.
    }
  }

  invalidateEmbeddingsCache();

  return NextResponse.json({
    ...stats,
    durationMs: Date.now() - startedAt,
    forced: force,
  });
}
