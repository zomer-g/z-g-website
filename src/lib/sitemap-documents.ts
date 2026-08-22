import type { MetadataRoute } from "next";
import { prisma } from "./prisma";
import { SITE_ORIGIN } from "./site";

/**
 * The document half of the sitemap.
 *
 * The site serves tens of thousands of real, indexable document pages —
 * /guidelines/{id} and /rulings/{id} — each with its own Hebrew title. None of
 * them were reachable by a crawler: the sitemap listed 36 hand-written URLs,
 * and the dashboards that list documents render their results client-side, so
 * the server-rendered HTML of /guidelines contained zero links to any
 * guideline. This is what gives Google a way in.
 *
 * Everything here reads from the local mirrors (guideline_docs, tagit_docs),
 * so building a slice is one indexed SELECT of two small columns — no upstream
 * calls, and no JSON blobs pulled into the web process.
 */

// Google caps a sitemap at 50,000 URLs. 5,000 keeps each response small and
// quick to generate on a 512 MB instance — 10,000 measured at 13s per request,
// which is long enough that a crawler may give up.
const CHUNK_SIZE = 5_000;

// The plan costs three COUNT queries, one of them a JSONB predicate over
// 80,000 rows, and every sitemap request needs it to locate its slice. It only
// changes when a mirror sync runs, so an hour of caching turns three scans per
// request into three per hour.
const PLAN_TTL_MS = 60 * 60 * 1000;
let planCache: { at: number; chunks: Chunk[] } | null = null;

/**
 * A document counts only if the detail page can actually give it a title.
 * This mirrors the exact fallback chain in /rulings/[id] — ai.שם_התיק, then
 * meta.case_name, then case_name, then filename — because a page that renders
 * as "ללא שם" is a thin result, and asking Google to crawl thousands of them
 * is worse than not asking at all.
 */
const RULING_HAS_TITLE = `COALESCE(
  NULLIF(TRIM(data::jsonb->'ai'->>'שם_התיק'), ''),
  NULLIF(TRIM(data::jsonb->'meta'->>'case_name'), ''),
  NULLIF(TRIM(data::jsonb->>'case_name'), ''),
  NULLIF(TRIM(data::jsonb->>'filename'), '')
) IS NOT NULL`;

/**
 * Which corpora go in, and at what path.
 *
 * Scope 1 (drug sentencing) is deliberately absent. Its dashboard applies an
 * admin base filter, so the public listing shows ~5,700 of the 56,900 mirrored
 * documents; the rest are reachable by direct URL but were never meant to be
 * listed. Publishing all 56,900 would flood the index with pages the site
 * itself chooses not to show. Scopes 4 and 6 have no such filter, so their
 * mirror IS the public set.
 */
type Source =
  | { kind: "guidelines" }
  | { kind: "rulings"; scopeId: number };

export interface Chunk {
  source: Source;
  offset: number;
  take: number;
}

const SOURCES: Source[] = [
  { kind: "guidelines" },
  { kind: "rulings", scopeId: 4 }, // לשון הרע
  { kind: "rulings", scopeId: 6 }, // חופש מידע
];

async function countOf(src: Source): Promise<number> {
  if (src.kind === "guidelines") {
    return prisma.guidelineDoc.count();
  }
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n FROM tagit_docs WHERE scope_id = $1 AND ${RULING_HAS_TITLE}`,
    src.scopeId,
  );
  return Number(rows[0]?.n ?? 0);
}

/**
 * The full chunk plan, in a stable order. Called once to enumerate the
 * sitemaps and again to serve each one, so it must be deterministic: sources
 * in a fixed order, slices by ascending id.
 */
export async function documentChunks(): Promise<Chunk[]> {
  if (planCache && Date.now() - planCache.at < PLAN_TTL_MS) return planCache.chunks;

  const chunks: Chunk[] = [];
  try {
    for (const source of SOURCES) {
      const total = await countOf(source);
      for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
        chunks.push({ source, offset, take: Math.min(CHUNK_SIZE, total - offset) });
      }
    }
  } catch (err) {
    // A sitemap that 500s teaches Google to stop asking. An empty document
    // section still leaves chunk 0 — the hand-written pages — serving.
    console.error("[sitemap] could not plan document chunks:", err);
    // Serve the last good plan if there is one rather than dropping every
    // document sitemap because of one failed count.
    return planCache?.chunks ?? [];
  }
  planCache = { at: Date.now(), chunks };
  return chunks;
}

export async function documentSitemap(index: number): Promise<MetadataRoute.Sitemap> {
  const chunks = await documentChunks();
  const chunk = chunks[index];
  if (!chunk) return [];

  try {
    if (chunk.source.kind === "guidelines") {
      const rows = await prisma.guidelineDoc.findMany({
        select: { id: true, documentDate: true },
        orderBy: { id: "asc" },
        skip: chunk.offset,
        take: chunk.take,
      });
      return rows.map((r) => ({
        url: `${SITE_ORIGIN}/guidelines/${r.id}`,
        lastModified: r.documentDate ?? undefined,
        changeFrequency: "yearly" as const,
        priority: 0.5,
      }));
    }

    const rows = await prisma.$queryRawUnsafe<
      { doc_id: number; document_date: Date | null }[]
    >(
      `SELECT doc_id, document_date FROM tagit_docs
       WHERE scope_id = $1 AND ${RULING_HAS_TITLE}
       ORDER BY doc_id ASC
       LIMIT $2 OFFSET $3`,
      chunk.source.scopeId,
      chunk.take,
      chunk.offset,
    );
    return rows.map((r) => ({
      url: `${SITE_ORIGIN}/rulings/${r.doc_id}`,
      lastModified: r.document_date ?? undefined,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.error(`[sitemap] chunk ${index} failed:`, err);
    return [];
  }
}
