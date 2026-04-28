import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  embedTexts,
  hashText,
  EMBED_MODEL,
  OpenAIEmbeddingsError,
} from "@/lib/openai-embeddings";
import { invalidateEmbeddingsCache } from "@/lib/guidelines-embeddings";
import { chunkGuideline } from "@/lib/guidelines-chunker";
import { fetchAllUpstreamGuidelines } from "@/lib/guidelines-upstream";

const UPSTREAM_BASE = "https://tag-it.biz/api/public/over-guidelines/documents";

const EMBED_BATCH = 64;

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface UpstreamSingleDoc {
  id: number;
  document_title?: string;
  topic?: string | null;
  summary?: string | null;
  content_text?: string | null;
}

// Fields in csv_row that are internal/noise — never feed to the indexer.
const CSV_METADATA_SKIP = new Set(["_id", "rank", "Data.File Data"]);
// Keep short text fields only; OCR text dumps and the like bloat the header.
const CSV_METADATA_MAX_LEN = 300;

function buildMetadataFromCsvRow(
  csvRow: Record<string, unknown> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!csvRow) return out;
  for (const [k, v] of Object.entries(csvRow)) {
    if (CSV_METADATA_SKIP.has(k)) continue;
    if (v == null) continue;
    const str =
      typeof v === "string"
        ? v
        : typeof v === "number" || typeof v === "boolean"
          ? String(v)
          : "";
    const trimmed = str.trim();
    if (!trimmed) continue;
    if (trimmed.length > CSV_METADATA_MAX_LEN) continue;
    out[k] = trimmed;
  }
  return out;
}

function getUpstreamApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const session = await auth();
  if (session?.user?.id) return true;
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get("x-cron-secret") === expected) return true;
  return false;
}

interface PendingEmbed {
  docId: number;
  chunkIdx: number;
  text: string;
  embeddingInput: string;
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

  // 1. List every guideline id by walking all upstream pages.
  const allItems = await fetchAllUpstreamGuidelines();
  if (allItems === null) {
    return NextResponse.json(
      { error: "Upstream list failed" },
      { status: 502 },
    );
  }
  const allIds = allItems.map((it) => it.id);
  // Index csv_row alongside body text so directive names that live only in
  // CSV fields (e.g. "Data.Name" on Israel Police directives) become
  // searchable. The list endpoint already returns csv_row — no extra fetch.
  const metadataById = new Map<number, Record<string, string>>();
  for (const it of allItems) {
    metadataById.set(
      it.id,
      buildMetadataFromCsvRow(it.csv_row as Record<string, unknown> | undefined),
    );
  }

  // 2. Load existing per-doc state to short-circuit unchanged docs.
  const existingRows = await prisma.guidelineEmbedding.findMany({
    where: { id: { in: allIds } },
    select: { id: true, contentHash: true },
  });
  const existingHash = new Map(existingRows.map((r) => [r.id, r.contentHash]));

  // Render kills the request after maxDuration (~5 min). With ~800 docs, a
  // forced rebuild can't finish in one shot. Process docs that are MISSING
  // from the index first — that way new directives (e.g. "נוהל מצלמות גוף")
  // get indexed even if the run is killed mid-way. Existing docs that just
  // need a hash-bump come after.
  const ids = [
    ...allIds.filter((id) => !existingHash.has(id)),
    ...allIds.filter((id) => existingHash.has(id)),
  ];

  const stats = {
    total: ids.length,
    skipped: 0,
    fetched: 0,
    docsRebuilt: 0,
    chunksCreated: 0,
    chunksDeleted: 0,
    embeddingBatches: 0,
    failed: 0,
    failedIds: [] as number[],
  };

  // 3. Process docs in waves. Each wave is fully atomic: fetch → chunk →
  // embed → DB write. If the Render 5-min timeout kills us mid-run, every
  // wave that completed before the kill is already persisted; only the
  // current in-flight wave is lost. This is what makes incremental progress
  // possible across multiple invocations.
  const PARALLEL = 6;
  const WAVE_SIZE = 40;

  // Render's HTTP gateway times out client requests at ~100s and returns 502
  // even though the worker may still be running. Stop accepting new waves at
  // ~75s so the in-flight wave can finish writing and we can return a clean
  // response with stoppedEarly=true. The admin re-clicks "build" to continue.
  const SOFT_DEADLINE_MS = 75_000;
  let stoppedEarly = false;

  for (let waveStart = 0; waveStart < ids.length; waveStart += WAVE_SIZE) {
    if (Date.now() - startedAt > SOFT_DEADLINE_MS) {
      stoppedEarly = true;
      break;
    }
    const waveIds = ids.slice(waveStart, waveStart + WAVE_SIZE);
    const pendingByDoc = new Map<number, PendingEmbed[]>();
    const docState = new Map<number, { hash: string; textChars: number }>();

    // 3a. Fetch + chunk + hash for this wave (parallel slices).
    for (let i = 0; i < waveIds.length; i += PARALLEL) {
      const slice = waveIds.slice(i, i + PARALLEL);
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
            const chunks = chunkGuideline({
              title: doc.document_title,
              topic: doc.topic ?? undefined,
              summary: doc.summary ?? undefined,
              content_text: doc.content_text,
              metadata: metadataById.get(id),
            });
            if (chunks.length === 0) {
              stats.skipped += 1;
              return;
            }

            const docHash = await hashText(
              `${EMBED_MODEL}\n${chunks.map((c) => c.embeddingInput).join("\n---\n")}`,
            );
            if (!force && existingHash.get(id) === docHash) {
              stats.skipped += 1;
              return;
            }

            docState.set(id, {
              hash: docHash,
              textChars: chunks.reduce((s, c) => s + c.text.length, 0),
            });
            pendingByDoc.set(
              id,
              chunks.map((c) => ({
                docId: id,
                chunkIdx: c.index,
                text: c.text,
                embeddingInput: c.embeddingInput,
              })),
            );
          } catch {
            stats.failed += 1;
            stats.failedIds.push(id);
          }
        }),
      );
    }

    if (pendingByDoc.size === 0) continue;

    // 3b. Embed this wave's chunks.
    const flat: PendingEmbed[] = [];
    for (const arr of pendingByDoc.values()) flat.push(...arr);
    const embeddedByKey = new Map<string, number[]>();
    for (let i = 0; i < flat.length; i += EMBED_BATCH) {
      const batch = flat.slice(i, i + EMBED_BATCH);
      try {
        const vectors = await embedTexts(batch.map((b) => b.embeddingInput));
        stats.embeddingBatches += 1;
        batch.forEach((b, idx) => {
          embeddedByKey.set(`${b.docId}:${b.chunkIdx}`, vectors[idx]);
        });
      } catch (err) {
        stats.failed += batch.length;
        stats.failedIds.push(...batch.map((b) => b.docId));
        if (err instanceof OpenAIEmbeddingsError) {
          console.error("OpenAI embedding failed:", err.status, err.message);
        } else {
          console.error("Embedding batch failed:", err);
        }
      }
    }

    // 3c. Write each fully-embedded doc in this wave.
    for (const [docId, chunks] of pendingByDoc) {
      const state = docState.get(docId);
      if (!state) continue;
      const allEmbedded = chunks.every((c) =>
        embeddedByKey.has(`${docId}:${c.chunkIdx}`),
      );
      if (!allEmbedded) {
        stats.failed += 1;
        stats.failedIds.push(docId);
        continue;
      }
      try {
        const result = await prisma.$transaction([
          prisma.guidelineChunk.deleteMany({ where: { docId } }),
          prisma.guidelineChunk.createMany({
            data: chunks.map((c) => ({
              docId: c.docId,
              chunkIdx: c.chunkIdx,
              text: c.text,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              embedding: embeddedByKey.get(`${docId}:${c.chunkIdx}`) as any,
              model: EMBED_MODEL,
            })),
          }),
          prisma.guidelineEmbedding.upsert({
            where: { id: docId },
            update: {
              contentHash: state.hash,
              model: EMBED_MODEL,
              textChars: state.textChars,
              chunkCount: chunks.length,
            },
            create: {
              id: docId,
              contentHash: state.hash,
              model: EMBED_MODEL,
              textChars: state.textChars,
              chunkCount: chunks.length,
            },
          }),
        ]);
        stats.docsRebuilt += 1;
        stats.chunksDeleted += result[0].count;
        stats.chunksCreated += result[1].count;
      } catch (err) {
        stats.failed += 1;
        stats.failedIds.push(docId);
        console.error(`Failed to write chunks for doc ${docId}:`, err);
      }
    }
  }

  invalidateEmbeddingsCache();

  return NextResponse.json({
    ...stats,
    durationMs: Date.now() - startedAt,
    forced: force,
    stoppedEarly,
    note: stoppedEarly
      ? "הריצה נעצרה על-ידי בודק הזמן הרך כדי לא להיהרג ב-Render. הרץ שוב כדי להמשיך מהמקום שנעצרה."
      : undefined,
  });
}
