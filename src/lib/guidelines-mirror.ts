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
  pruned: number;
  durationMs: number;
}

/**
 * Full replace: walk upstream, upsert every document, then delete the ids that
 * are no longer there. Incremental would need an upstream "changed since"
 * cursor, which this collection does not expose; a full walk is ~5-6 minutes
 * on a runner, which is cheap enough to just do.
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

  const seen = new Set<number>();
  const CHUNK = 500;
  for (let i = 0; i < cleaned.length; i += CHUNK) {
    const chunk = cleaned.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map((doc) => {
        seen.add(doc.id);
        const row = {
          data: doc as unknown as object,
          documentDate: parseDate((doc as { document_date?: unknown }).document_date),
          sourceLabel: doc.source_label ?? null,
        };
        return prisma.guidelineDoc.upsert({
          where: { id: doc.id },
          create: { id: doc.id, ...row },
          update: row,
        });
      }),
    );
    console.log(
      `[guidelines-mirror] upserted ${Math.min(i + CHUNK, cleaned.length)}/${cleaned.length}`,
    );
  }

  // Prune documents the upstream no longer returns. Done after the upserts so
  // a crash midway leaves the mirror over-complete rather than short.
  const { count: pruned } = await prisma.guidelineDoc.deleteMany({
    where: { id: { notIn: Array.from(seen) } },
  });

  const durationMs = Date.now() - startedAt;
  await prisma.guidelineSyncState.upsert({
    where: { id: STATE_ID },
    create: {
      id: STATE_ID,
      upstreamTotal: cleaned.length,
      mirroredCount: cleaned.length,
      lastSyncAt: new Date(),
      lastDurationMs: durationMs,
      lastError: null,
    },
    update: {
      upstreamTotal: cleaned.length,
      mirroredCount: cleaned.length,
      lastSyncAt: new Date(),
      lastDurationMs: durationMs,
      lastError: null,
    },
  });

  return { mirrored: cleaned.length, pruned, durationMs };
}
