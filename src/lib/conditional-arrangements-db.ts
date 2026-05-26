/**
 * Database-backed storage and querying for conditional arrangements.
 *
 * Why this exists:
 *   The previous architecture fetched all 33 k records from CKAN on every
 *   cold-start and held them in a Node.js in-memory cache (Map). On Render
 *   Starter (512 MB RAM), the V8 heap hit ~250 MB and OOM-killed the process
 *   in a crash loop. Storing records in PostgreSQL eliminates that entirely:
 *   API requests do a fast indexed DB query (returning ≤24 rows) instead of
 *   loading the full dataset into the heap.
 *
 * Sync strategy:
 *   - On first request after a fresh deploy (DB empty): blocking sync.
 *   - On subsequent requests: serve from DB immediately, then trigger a
 *     background version-check (non-blocking). If the ODATA resource UUID
 *     has changed, the background fetch re-populates the DB for that source.
 *   - Re-fetch only happens when the ODATA resource UUID changes (≈weekly).
 *
 * Memory profile during sync:
 *   - 2 in-flight CKAN pages × ~12 MB JSON = ~24 MB peak (vs ~250 MB before).
 *   - Each page is inserted to DB in 500-row batches, then GC'd.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  POLICE_DATASET_ID,
  PROSECUTOR_DATASET_ID,
  POLICE_FIELDS,
  PROSECUTOR_FIELDS,
  fetchCKANPage,
  getLatestResourceId,
  type CKANRow,
} from "@/lib/conditional-arrangements-upstream";
import type {
  ConditionalArrangement,
  ArrangementsResponse,
  ArrangementSource,
} from "@/types/conditional-arrangement";

/* ─── Constants ───────────────────────────────────────────────────── */

// How often to check ODATA for a new resource version.
const SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

// Rows fetched from CKAN per request (mirrors upstream).
const PAGE_SIZE = 3000;
// Parallel CKAN pages per round (mirrors upstream).
const PARALLEL = 2;

// Max rows per Prisma createMany call.
// 500 rows × ~10 columns = ~5 000 params — well under Postgres's 65 535 limit.
const INSERT_BATCH = 500;

// Description chars shown in the card snippet (full text stored in DB for detail).
const SNIPPET_CHARS = 300;

/* ─── Prosecutor unit codes ─────────────────────────────────────── */

const PROSECUTOR_UNIT_NAMES: Record<string, string> = {
  "01": "פרקליטות מחוז דרום (פלילי)",
  "02": "פרקליטות מחוז תל-אביב (פלילי)",
  "03": "פרקליטות מחוז צפון (פלילי)",
  "04": "פרקליטות מחוז מרכז (פלילי)",
  "05": "פרקליטות מחוז ירושלים (פלילי)",
  "06": "פרקליטות המדינה - המחלקה לחקירות שוטרים",
  "07": "פרקליטות המדינה - המחלקה הכלכלית",
  "08": "פרקליטות מחוז חיפה (פלילי)",
  "09": "פרקליטות המדינה - מחלקת הסייבר",
  "10": "פרקליטות מחוז תל אביב - מיסוי וכלכלה",
};

/* ─── Text helpers ────────────────────────────────────────────────── */

function str(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}

/** DD/MM/YYYY → YYYY-MM-DD, or null if unparseable. */
function parseDateSlash(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function extractOffense(text: string | null | undefined): string | null {
  if (!text) return null;
  const idx = text.indexOf("הוראות החיקוק שפורטו בהסדר");
  if (idx === -1) return null;
  const after = text.slice(idx + "הוראות החיקוק שפורטו בהסדר".length);
  const trimmed = after.replace(/^[:\s]+/, "");
  const stop = trimmed.search(/(?:תנאי[^ה]|נימוקים|$)/);
  const excerpt = stop > 0 ? trimmed.slice(0, stop) : trimmed;
  return excerpt.replace(/\s+/g, " ").trim().slice(0, 200) || null;
}

function extractAmount(text: string | null | undefined, re: RegExp): number | null {
  if (!text) return null;
  const m = text.match(re);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const FINE_RE = /(?:תשלום|קנס).*?(?:בסך|סך)\s+([\d,]+)\s*(?:ש|₪)/;
const COMP_RE = /פיצוי.*?(?:בסך|סך)\s+([\d,]+)\s*(?:ש|₪)/;

/**
 * Normalise Hebrew text for search storage and querying.
 * Lowercase + NFKD decomposition + strip cantillation marks.
 * Stored in searchText column; query terms normalised the same way
 * so LIKE '%term%' matches without mode: insensitive overhead.
 */
function normText(s: string): string {
  return s
    .toLocaleLowerCase("he-IL")
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─── CKAN row → DB row mapping ─────────────────────────────────── */

type DbRow = {
  id: string;
  source: string;
  date: string | null;
  district: string | null;
  offense: string | null;
  fine: number | null;
  compensation: number | null;
  description: string | null;
  caseNumber: string | null;
  searchText: string | null;
};

function mapPoliceRow(row: CKANRow, rowIdx: number): DbRow {
  const ckanId = str(row["_id"]) || String(rowIdx);
  const fullDesc = str(row["Data.details.Description_text"]);
  const branch = str(row["Data.ShemShluchaMetapelet"]) || null;
  const caseNo = str(row["Data.Tikim"]) || null;
  const date = str(row["Data.Taarich"]) || null;
  const offense = extractOffense(fullDesc);
  const searchText = [
    normText(fullDesc.slice(0, 1000)),
    normText(str(branch)),
    normText(str(caseNo)),
    normText(str(offense)),
  ].filter(Boolean).join(" ") || null;
  return {
    id: `police:${ckanId}`,
    source: "police",
    date: parseDateSlash(date),
    district: branch,
    offense,
    fine: extractAmount(fullDesc, FINE_RE),
    compensation: extractAmount(fullDesc, COMP_RE),
    description: fullDesc || null,
    caseNumber: caseNo,
    searchText,
  };
}

function mapProsecutorRow(row: CKANRow, rowIdx: number): DbRow {
  const ckanId = str(row["_id"]) || String(rowIdx);
  const fullDesc = str(row["Data.more_info.Description_text"]);
  const caseNo = str(row["Data.case_number"]) || null;
  const unitCode = str(row["Data.unit"]);
  const unitName = PROSECUTOR_UNIT_NAMES[unitCode] || unitCode || null;
  const offense = extractOffense(fullDesc);
  const searchText = [
    normText(fullDesc.slice(0, 1000)),
    normText(str(unitName)),
    normText(str(caseNo)),
    normText(str(offense)),
  ].filter(Boolean).join(" ") || null;
  return {
    id: `prosecutor:${ckanId}`,
    source: "prosecutor",
    date: null,
    district: unitName,
    offense,
    fine: extractAmount(fullDesc, FINE_RE),
    compensation: extractAmount(fullDesc, COMP_RE),
    description: fullDesc || null,
    caseNumber: caseNo,
    searchText,
  };
}

/* ─── Sync ────────────────────────────────────────────────────────── */

// Singleton promise prevents concurrent syncs (no double-fetch if two
// requests arrive simultaneously while DB is empty on first deploy).
let inflightSync: Promise<void> | null = null;

/**
 * Thrown by ensureData() when the DB is empty and a background sync has been
 * kicked off. The route handler should return 503 + Retry-After immediately
 * so Render's 60s proxy timeout is never hit (the sync itself takes ~65s).
 */
export class SyncInProgressError extends Error {
  constructor() {
    super("Initial sync in progress — retry in ~60 s");
    this.name = "SyncInProgressError";
  }
}

/**
 * Ensure the DB is populated. When the DB is empty (first deploy) a
 * background sync is started and SyncInProgressError is thrown immediately —
 * the caller must return 503 so Render's proxy doesn't time out the request
 * while the ~65 s sync runs. Subsequent requests throw the same error until
 * the sync finishes and the CaSync row is written, after which this function
 * returns normally and callers can query the DB.
 */
export async function ensureData(): Promise<void> {
  const meta = await prisma.caSync.findUnique({ where: { id: "singleton" } });

  if (!meta) {
    // DB empty: kick off the sync in the background and return 503 immediately.
    // This avoids hitting Render's 60-second proxy timeout while the sync runs.
    if (!inflightSync) {
      console.log("ca-sync: DB empty, starting background initial sync");
      inflightSync = _doSync(true).finally(() => { inflightSync = null; });
    }
    throw new SyncInProgressError();
  }

  // DB has data — serve immediately, version-check in background if stale.
  _triggerBackgroundVersionCheck(meta.syncedAt);
}

function _triggerBackgroundVersionCheck(syncedAt: Date): void {
  if (inflightSync) return; // already running
  if (Date.now() - syncedAt.getTime() < SYNC_INTERVAL_MS) return; // still fresh

  inflightSync = _doSync(false).finally(() => { inflightSync = null; });
  // Don't await — purely background
}

/**
 * Force a full re-fetch from CKAN regardless of stored resource IDs.
 * Called by the admin /sync endpoint.
 */
export async function forceSync(): Promise<{ police: number; prosecutor: number }> {
  if (inflightSync) await inflightSync; // wait for any in-progress sync first
  inflightSync = _doSync(true).finally(() => { inflightSync = null; });
  await inflightSync;
  const [police, prosecutor] = await prisma.$transaction([
    prisma.caRecord.count({ where: { source: "police" } }),
    prisma.caRecord.count({ where: { source: "prosecutor" } }),
  ]);
  return { police, prosecutor };
}

async function _doSync(force: boolean): Promise<void> {
  const t0 = Date.now();
  console.log(`ca-sync: starting (force=${force})`);

  // Resolve latest resource IDs from ODATA
  const [policeId, prosecutorId] = await Promise.all([
    getLatestResourceId(POLICE_DATASET_ID),
    getLatestResourceId(PROSECUTOR_DATASET_ID),
  ]).catch((err) => {
    console.error("ca-sync: failed to resolve resource IDs:", err);
    return [null, null] as [null, null];
  });

  const meta = await prisma.caSync.findUnique({ where: { id: "singleton" } });

  const policeChanged = force || (policeId !== null && policeId !== meta?.policeResourceId);
  const prosecutorChanged = force || (prosecutorId !== null && prosecutorId !== meta?.prosecutorResourceId);

  if (!policeChanged && !prosecutorChanged) {
    console.log("ca-sync: versions unchanged, updating timestamp only");
    await prisma.caSync.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        policeResourceId: meta?.policeResourceId,
        prosecutorResourceId: meta?.prosecutorResourceId,
      },
      update: { syncedAt: new Date() },
    });
    return;
  }

  if (policeChanged && policeId) {
    await _syncSource("police", policeId);
  }
  if (prosecutorChanged && prosecutorId) {
    await _syncSource("prosecutor", prosecutorId);
  }

  await prisma.caSync.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      policeResourceId: policeId ?? undefined,
      prosecutorResourceId: prosecutorId ?? undefined,
    },
    update: {
      ...(policeId ? { policeResourceId: policeId } : {}),
      ...(prosecutorId ? { prosecutorResourceId: prosecutorId } : {}),
      syncedAt: new Date(),
    },
  });

  console.log(`ca-sync: done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function _syncSource(source: ArrangementSource, resourceId: string): Promise<void> {
  const fields = source === "police" ? POLICE_FIELDS : PROSECUTOR_FIELDS;
  const mapper = source === "police" ? mapPoliceRow : mapProsecutorRow;

  // Drop existing records for this source before re-inserting.
  const { count: deleted } = await prisma.caRecord.deleteMany({ where: { source } });
  console.log(`ca-sync: deleted ${deleted} existing ${source} records`);

  // Fetch first page from CKAN
  const first = await fetchCKANPage(resourceId, 0, PAGE_SIZE, fields);
  if (!first) {
    console.error(`ca-sync: failed to fetch first page for ${source}`);
    return;
  }

  // Insert first page immediately — raw rows are GC'd after mapping
  await _insertBatch(first.records.map((row, i) => mapper(row, i)));
  let rowIdx = first.records.length;
  const total = first.total;
  console.log(`ca-sync: ${source} total = ${total}`);

  // Remaining pages in parallel batches of PARALLEL
  const offsets: number[] = [];
  for (let off = PAGE_SIZE; off < total; off += PAGE_SIZE) offsets.push(off);

  for (let i = 0; i < offsets.length; i += PARALLEL) {
    const batch = offsets.slice(i, i + PARALLEL);
    const pages = await Promise.all(
      batch.map((off) => fetchCKANPage(resourceId, off, PAGE_SIZE, fields)),
    );
    for (const page of pages) {
      if (!page) { console.error(`ca-sync: failed a page for ${source}`); continue; }
      await _insertBatch(page.records.map((row, j) => mapper(row, rowIdx + j)));
      rowIdx += page.records.length;
      // page.records now unreferenced → raw CKAN rows with large descriptions GC'd
    }
  }

  console.log(`ca-sync: inserted ${rowIdx} ${source} records`);
}

async function _insertBatch(rows: DbRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    await prisma.caRecord.createMany({
      data: rows.slice(i, i + INSERT_BATCH),
      skipDuplicates: true,
    });
  }
}

/* ─── Query ───────────────────────────────────────────────────────── */

function normQ(s: string | null): string {
  if (!s) return "";
  return s
    .toLocaleLowerCase("he-IL")
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampInt(v: string | null, min: number, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.floor(n)) : fallback;
}

function buildWhere(params: URLSearchParams): Prisma.CaRecordWhereInput {
  const source = params.get("source");
  const q = normQ(params.get("q"));
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const district = normQ(params.get("district"));
  const offense = normQ(params.get("offense"));

  const AND: Prisma.CaRecordWhereInput[] = [];

  if (source && source !== "all") AND.push({ source });

  if (dateFrom || dateTo) {
    const f: Prisma.StringNullableFilter = {};
    if (dateFrom) f.gte = dateFrom;
    if (dateTo) f.lte = dateTo;
    AND.push({ date: f });
  }

  // District: user selects an exact value from facet dropdown; use
  // case-insensitive contains for robustness with substring filters.
  if (district) AND.push({ district: { contains: district, mode: "insensitive" } });

  // Offense: same pattern.
  if (offense) AND.push({ offense: { contains: offense, mode: "insensitive" } });

  // Free-text AND search: each term must appear in the pre-normalised
  // searchText blob. Text and query are both normalised → plain LIKE works.
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    for (const term of terms) {
      AND.push({ searchText: { contains: term } });
    }
  }

  return AND.length > 0 ? { AND } : {};
}

function dbRowToArrangement(row: {
  id: string;
  source: string;
  date: string | null;
  district: string | null;
  offense: string | null;
  fine: number | null;
  compensation: number | null;
  description: string | null;
  caseNumber: string | null;
}): ConditionalArrangement {
  const raw: Record<string, string> = {};
  if (row.caseNumber) raw["מספר תיק"] = row.caseNumber;
  if (row.district) raw[row.source === "police" ? "שלוחה" : "יחידה"] = row.district;
  if (row.description) raw["תיאור"] = row.description.slice(0, SNIPPET_CHARS);
  return {
    _id: row.id,
    source: row.source as ArrangementSource,
    date: row.date,
    district: row.district,
    offense: row.offense,
    fine: row.fine,
    compensation: row.compensation,
    raw,
  };
}

export async function queryArrangements(
  params: URLSearchParams,
): Promise<ArrangementsResponse> {
  const skip = clampInt(params.get("skip"), 0, 0);
  const limit = Math.min(100, Math.max(1, clampInt(params.get("limit"), 1, 24)));
  const sortAsc = params.get("sort") === "date_asc";
  const where = buildWhere(params);
  const orderBy: Prisma.CaRecordOrderByWithRelationInput[] = [
    { date: sortAsc ? "asc" : "desc" },
    { id: "asc" }, // stable tiebreak
  ];

  // Run count, page, and facets in a single transaction for consistency.
  const [total, records, districtFacets, offenseFacets] = await prisma.$transaction([
    prisma.caRecord.count({ where }),
    prisma.caRecord.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        source: true,
        date: true,
        district: true,
        offense: true,
        fine: true,
        compensation: true,
        description: true,
        caseNumber: true,
      },
    }),
    prisma.caRecord.findMany({
      where,
      select: { district: true },
      distinct: ["district"],
      orderBy: { district: "asc" },
    }),
    prisma.caRecord.findMany({
      where,
      select: { offense: true },
      distinct: ["offense"],
      orderBy: { offense: "asc" },
    }),
  ]);

  return {
    total,
    skip,
    limit,
    records: records.map(dbRowToArrangement),
    facets: {
      districts: districtFacets
        .map((r) => r.district)
        .filter((d): d is string => d !== null)
        .sort((a, b) => a.localeCompare(b, "he")),
      offenses: offenseFacets
        .map((r) => r.offense)
        .filter((o): o is string => o !== null)
        .sort((a, b) => a.localeCompare(b, "he")),
    },
  };
}

/**
 * Fetch the full description text for a single arrangement from the DB.
 * Used by the detail API route instead of re-fetching from CKAN.
 */
export async function getArrangementDescription(
  source: ArrangementSource,
  ckanId: number,
): Promise<string | null> {
  const row = await prisma.caRecord.findUnique({
    where: { id: `${source}:${ckanId}` },
    select: { description: true },
  });
  return row?.description ?? null;
}
