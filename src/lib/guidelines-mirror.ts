import type { Guideline } from "@/types/guideline";
import { prisma } from "./prisma";
import { isMirrorUsable, type MirrorState } from "./guidelines-mirror-state";
import { fetchAllUpstreamGuidelines, stripUrls } from "./guidelines-upstream";

export { isMirrorUsable, type MirrorState } from "./guidelines-mirror-state";

/**
 * The local copy of the guidelines corpus.
 *
 * Reading side runs in the web process and is deliberately dumb: one query,
 * rows in, documents out. Writing side (`syncGuidelinesMirror`) is for the
 * GitHub runner only — corpus walks inside the 512 MB web instance are what
 * caused the OOM kills of late July, see src/instrumentation.ts.
 */

const STATE_ID = 1;

export async function readMirrorState(): Promise<MirrorState | null> {
  const row = await prisma.guidelineSyncState.findUnique({
    where: { id: STATE_ID },
  });
  if (!row) return null;
  return {
    mirroredCount: row.mirroredCount,
    upstreamTotal: row.upstreamTotal,
    lastSyncAt: row.lastSyncAt,
  };
}

/**
 * Whole corpus, in upstream order (newest first by document date, nulls last —
 * the order the dashboard shows when no explicit sort is set).
 *
 * Returns null rather than throwing: every caller has a working upstream
 * fallback, and a mirror problem must never be the thing that takes the page
 * down.
 */
export async function loadCorpusFromMirror(): Promise<Guideline[] | null> {
  try {
    const state = await readMirrorState();
    if (!isMirrorUsable(state)) return null;

    const rows = await prisma.guidelineDoc.findMany({
      orderBy: [{ documentDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      select: { data: true },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => r.data as unknown as Guideline);
  } catch (err) {
    console.error("[guidelines-mirror] read failed, falling back:", err);
    return null;
  }
}

/* ─── Write side — runner only ─── */

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface SyncResult {
  mirrored: number;
  replaced: number;
  durationMs: number;
}

// Bulk inserts, not per-row upserts. 12,281 individual upserts overran
// Prisma's 5s interactive-transaction limit after ~500 rows; createMany is a
// single multi-row INSERT per chunk and finishes the whole corpus in seconds.
const INSERT_CHUNK = 500;

// The walk itself is the slow part and has already happened by the time this
// transaction opens, but a full replace of 12k rows still needs more than the
// 5s default.
const TX_TIMEOUT_MS = 120_000;

/**
 * Full replace: walk upstream, then swap the whole table over in one
 * transaction. Incremental would need an upstream "changed since" cursor,
 * which this collection does not expose; a full walk is ~5 minutes on a
 * runner, which is cheap enough to just do.
 *
 * Delete-then-insert inside a transaction also removes the need for a
 * separate prune pass, and readers keep seeing the previous corpus until it
 * commits — at no point is a half-built mirror visible.
 */
export async function syncGuidelinesMirror(): Promise<SyncResult> {
  const startedAt = Date.now();
  const items = await fetchAllUpstreamGuidelines();
  if (items === null) {
    const message = "upstream walk failed — mirror left untouched";
    await prisma.guidelineSyncState.upsert({
      where: { id: STATE_ID },
      create: { id: STATE_ID, lastError: message },
      update: { lastError: message },
    });
    throw new Error(message);
  }

  // Same strip the API applies before documents leave the process: the
  // upstream file/text URLs carry our key, and they must not be persisted.
  const cleaned = stripUrls(items);

  // Upstream can repeat an id across pages when documents shift between
  // requests; the primary key would reject the duplicate and abort the swap.
  const byId = new Map<number, (typeof cleaned)[number]>();
  for (const doc of cleaned) byId.set(doc.id, doc);
  const rows = Array.from(byId.values()).map((doc) => ({
    id: doc.id,
    data: doc as unknown as object,
    documentDate: parseDate((doc as { document_date?: unknown }).document_date),
    sourceLabel: doc.source_label ?? null,
  }));

  const replaced = await prisma.$transaction(
    async (tx) => {
      const { count } = await tx.guidelineDoc.deleteMany({});
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        await tx.guidelineDoc.createMany({
          data: rows.slice(i, i + INSERT_CHUNK),
        });
      }
      return count;
    },
    { timeout: TX_TIMEOUT_MS, maxWait: 20_000 },
  );
  console.log(`[guidelines-mirror] replaced ${replaced} rows with ${rows.length}`);

  const durationMs = Date.now() - startedAt;
  await prisma.guidelineSyncState.upsert({
    where: { id: STATE_ID },
    create: {
      id: STATE_ID,
      upstreamTotal: rows.length,
      mirroredCount: rows.length,
      lastSyncAt: new Date(),
      lastDurationMs: durationMs,
      lastError: null,
    },
    update: {
      upstreamTotal: rows.length,
      mirroredCount: rows.length,
      lastSyncAt: new Date(),
      lastDurationMs: durationMs,
      lastError: null,
    },
  });

  return { mirrored: rows.length, replaced, durationMs };
}
