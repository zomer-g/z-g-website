/**
 * Fetcher for conditional arrangements from odata.org.il (CKAN DataStore).
 *
 * Data flow:
 *  1. Query over.org.il to get the latest resource UUID for each dataset.
 *  2. Query odata.org.il/api/3/action/datastore_search with that UUID to
 *     fetch all rows in parallel batches.
 *
 * Police dataset fields (from CKAN):
 *   Data.ShemShluchaMetapelet  – branch/station name (district)
 *   Data.Tikim                 – case number
 *   Data.Taarich               – date (DD/MM/YYYY)
 *   Data.HeTaarich             – Hebrew date
 *   Data.details.Description_text – full arrangement text
 *   Data.details.DescriptionHtmlString – HTML (excluded from raw display)
 *
 * Prosecutor dataset fields (from CKAN):
 *   Data.case_number           – case number
 *   Data.unit                  – unit code
 *   UrlName                    – slug
 *   Data.more_info.Description_text – full arrangement text
 *   Data.more_info.DescriptionHtmlString – HTML (excluded from raw display)
 *   Data.more_info.DescriptionBlankTextString – (excluded from raw display)
 */

import type {
  ConditionalArrangement,
  ArrangementSource,
  OverVersionObject,
  RawRecord,
} from "@/types/conditional-arrangement";

/* ─── Constants ──────────────────────────────────────────────────────── */

const OVER_BASE = "https://www.over.org.il/api";
const ODATA_BASE = "https://www.odata.org.il";

export const POLICE_DATASET_ID = "d49264eb-493c-4ab6-8a43-8784f6ae0fbf";
export const PROSECUTOR_DATASET_ID = "9fbe426a-4750-4202-94aa-0518fe9e575c";
// Ministry of Labor conditional arrangements — 359 records, one unit.
export const LABOR_DATASET_ID = "00fe9751-f316-4374-acd0-e148635cc7fb";

// Key used in resource_mappings for the scraped CSV resource.
const RESOURCE_KEY = "נתוני הסורק";

// 3 000 rows per CKAN request balances request count vs. in-flight JSON size.
// Police dataset (32 k rows): 11 pages × 2 parallel = ~6 rounds ≈ 12 s.
const PAGE_SIZE = 3000;
// Keep parallel fetches at 2 to avoid OOM spikes on Render Starter (512 MB).
// Peak usage during fetch: 2 in-flight responses × ~12 MB JSON = ~24 MB extra.
const PARALLEL = 2;

// Truncate stored description texts to keep cached RAM in check.
// Offense/fine/compensation are extracted from the FULL text before truncation.
// Card UI shows ≤220 chars; 500 chars gives the free-text search enough
// context to find terms that appear after a typical case-number preamble.
// "גניבה"-style queries now hit the offense field (always included in the
// haystack), so only item-specific words like "פלאפון" need to be in here.
// Impact: 33 k records × 500 chars ≈ 16 MB vs. × 5 KB untruncated ≈ 160 MB.
const MAX_DESC_CHARS = 300;

/* ─── Prosecutor unit code → display name (source: gov.il filter dropdown) ── */

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

// Only fetch the fields we actually use. This excludes the large HTML blobs
// (DescriptionHtmlString, DescriptionBlankTextString) which account for most
// of the response size (~4 KB per police record × 32 k ≈ 128 MB).
export const POLICE_FIELDS = [
  "_id",
  "Data.ShemShluchaMetapelet",
  "Data.Tikim",
  "Data.Taarich",
  "Data.HeTaarich",
  "Data.details.Description_text",
].join(",");

export const PROSECUTOR_FIELDS = [
  "_id",
  "Data.case_number",
  "Data.unit",
  "Data.more_info.Description_text",
  "UrlName",
].join(",");

export const LABOR_FIELDS = [
  "_id",
  "Data.casenumber",
  "Data.moredetails.Description_text",
].join(",");

/* ─── Text extraction helpers ────────────────────────────────────────── */

/** Parse DD/MM/YYYY → YYYY-MM-DD. Returns null if unparseable. */
function parseDateSlash(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Extract offense/statute text from the plain-text description. */
function extractOffense(text: string | null | undefined): string | null {
  if (!text) return null;
  const idx = text.indexOf("הוראות החיקוק שפורטו בהסדר");
  if (idx === -1) return null;
  const after = text.slice(idx + "הוראות החיקוק שפורטו בהסדר".length);
  // Strip leading colon/whitespace
  const trimmed = after.replace(/^[:\s]+/, "");
  // Take text until next major section
  const stop = trimmed.search(/(?:תנאי[^ה]|נימוקים|$)/);
  const excerpt = stop > 0 ? trimmed.slice(0, stop) : trimmed;
  const cleaned = excerpt.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 200) || null;
}

/** Extract a shekel amount from text using the given regex. */
function extractAmount(text: string | null | undefined, re: RegExp): number | null {
  if (!text) return null;
  const m = text.match(re);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const FINE_RE = /(?:תשלום|קנס).*?(?:בסך|סך)\s+([\d,]+)\s*(?:ש|₪)/;
const COMP_RE = /פיצוי.*?(?:בסך|סך)\s+([\d,]+)\s*(?:ש|₪)/;

/* ─── Record normalisation ───────────────────────────────────────────── */

/** A raw row as returned by CKAN datastore_search. */
export type CKANRow = Record<string, string | number | null>;

function str(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}

function normalisePolice(row: CKANRow, rowIdx: number): ConditionalArrangement {
  // Run extraction on the FULL text; store only a truncated snippet in raw.
  const fullDesc = str(row["Data.details.Description_text"]);
  const descSnippet = fullDesc.slice(0, MAX_DESC_CHARS);
  const raw: RawRecord = {};
  const branch = str(row["Data.ShemShluchaMetapelet"]);
  const caseNo = str(row["Data.Tikim"]);
  const date = str(row["Data.Taarich"]);
  const heDate = str(row["Data.HeTaarich"]);
  if (branch) raw["שלוחה"] = branch;
  if (caseNo) raw["מספר תיק"] = caseNo;
  if (date) raw["תאריך"] = date;
  if (heDate) raw["תאריך עברי"] = heDate;
  if (descSnippet) raw["תיאור"] = descSnippet;
  return {
    _id: `police:${str(row["_id"]) || rowIdx}`,
    source: "police",
    date: parseDateSlash(date),
    district: branch || null,
    offense: extractOffense(fullDesc),
    fine: extractAmount(fullDesc, FINE_RE),
    compensation: extractAmount(fullDesc, COMP_RE),
    raw,
  };
}

function normaliseProsecutor(row: CKANRow, rowIdx: number): ConditionalArrangement {
  // Run extraction on the FULL text; store only a truncated snippet in raw.
  const fullDesc = str(row["Data.more_info.Description_text"]);
  const descSnippet = fullDesc.slice(0, MAX_DESC_CHARS);
  const raw: RawRecord = {};
  const caseNo = str(row["Data.case_number"]);
  const unitCode = str(row["Data.unit"]);
  // Resolve numeric code to display name; fall back to the raw code.
  const unitName = PROSECUTOR_UNIT_NAMES[unitCode] || unitCode;
  if (caseNo) raw["מספר תיק"] = caseNo;
  if (unitName) raw["יחידה"] = unitName;
  // UrlName is an internal slug — not informative, omitted from display.
  if (descSnippet) raw["תיאור"] = descSnippet;
  return {
    _id: `prosecutor:${str(row["_id"]) || rowIdx}`,
    source: "prosecutor",
    date: null,
    district: unitName || null,
    offense: extractOffense(fullDesc),
    fine: extractAmount(fullDesc, FINE_RE),
    compensation: extractAmount(fullDesc, COMP_RE),
    raw,
  };
}

/* ─── over.org.il — get latest resource (DataStore or R2 CSV) ────────── */

/**
 * The newest queryable copy of a dataset. over.org.il stores scraped versions
 * either in the ODATA CKAN DataStore (legacy, value = resource UUID) or on
 * Cloudflare R2 (current default, value = "r2:<object key>"). R2 versions
 * have no DataStore — they must be downloaded as CSV via the OVER download
 * endpoint (which redirects to R2) and parsed with streamR2CsvRows().
 */
export type LatestResource =
  | { kind: "datastore"; id: string }
  | { kind: "r2"; id: string; versionId: string };

export async function getLatestResource(datasetId: string): Promise<LatestResource | null> {
  const url = `${OVER_BASE}/datasets/${datasetId}/versions?limit=20&ordering=-version_number`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as OverVersionObject[] | { results: OverVersionObject[] };
  const versions = Array.isArray(json) ? json : (json.results ?? []);
  if (!versions.length) return null;
  const sorted = [...versions].sort(
    (a, b) => b.version_number - a.version_number,
  );
  for (const v of sorted) {
    const rid = v.resource_mappings?.[RESOURCE_KEY];
    if (!rid) continue;
    if (rid.startsWith("r2:")) return { kind: "r2", id: rid, versionId: v.id };
    return { kind: "datastore", id: rid };
  }
  return null;
}

export async function getLatestResourceId(datasetId: string): Promise<string | null> {
  const url = `${OVER_BASE}/datasets/${datasetId}/versions?limit=20&ordering=-version_number`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as OverVersionObject[] | { results: OverVersionObject[] };
  const versions = Array.isArray(json) ? json : (json.results ?? []);
  if (!versions.length) return null;
  // Newest version first. over.org.il recently began storing some scraped
  // versions as Cloudflare R2 CSV paths ("r2:datasets/…") instead of loading
  // them into the CKAN DataStore. datastore_search returns 404 for an R2 path,
  // so skip those and fall back to the newest version that still exposes a real
  // DataStore resource UUID — that data is a few days older but queryable.
  const sorted = [...versions].sort(
    (a, b) => b.version_number - a.version_number,
  );
  for (const v of sorted) {
    const rid = v.resource_mappings?.[RESOURCE_KEY];
    if (rid && !rid.startsWith("r2:")) return rid;
  }
  return null;
}

/* ─── odata.org.il — CKAN DataStore pagination ───────────────────────── */

interface CKANResponse {
  success: boolean;
  result: {
    total: number;
    records: CKANRow[];
  };
}

export async function fetchCKANPage(
  resourceId: string,
  offset: number,
  limit: number,
  fields?: string,
): Promise<{ records: CKANRow[]; total: number } | null> {
  // sort=_id ensures stable pagination — without an explicit sort CKAN's default
  // ordering is non-deterministic and the same record can appear at multiple
  // offsets, resulting in ~9 000 duplicate IDs across the 32 k police dataset.
  let url = `${ODATA_BASE}/api/3/action/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=${limit}&offset=${offset}&sort=_id`;
  if (fields) url += `&fields=${encodeURIComponent(fields)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as CKANResponse;
  if (!json.success) return null;
  return {
    records: json.result.records,
    total: json.result.total,
  };
}

/* ─── R2 CSV streaming ───────────────────────────────────────────────── */

/**
 * Incremental RFC-4180 CSV parser fed with string chunks.
 *
 * Exists because R2-stored versions are raw CSV files with no queryable API —
 * and the police file is ~250 MB (it embeds per-row HTML), far too large to
 * buffer on Render Starter (512 MB). Chunks are parsed as they stream in and
 * complete rows are emitted immediately, so peak memory stays at one network
 * chunk + one batch of rows regardless of file size.
 *
 * Handles quoted fields containing commas, newlines, and "" escapes, with all
 * quote state carried across chunk boundaries.
 */
class CsvStreamParser {
  private field = "";
  private row: string[] = [];
  private inQuotes = false;
  // Saw a '"' inside a quoted field; the NEXT char decides whether it was an
  // escaped quote ("") or the closing quote. Carried across chunk boundaries.
  private quotePending = false;
  private fieldHadContent = false;

  write(chunk: string, emitRow: (row: string[]) => void): void {
    const n = chunk.length;
    // Native regex scan for the next special char — vastly faster than a
    // per-char JS loop over a 250 MB file.
    const special = /[",\r\n]/g;
    let i = 0;
    while (i < n) {
      if (this.quotePending) {
        this.quotePending = false;
        if (chunk[i] === '"') {
          this.field += '"';
          i++;
        } else {
          this.inQuotes = false; // closing quote; reprocess chunk[i] unquoted
        }
        continue;
      }
      if (this.inQuotes) {
        const q = chunk.indexOf('"', i);
        if (q === -1) {
          this.field += chunk.slice(i);
          return;
        }
        this.field += chunk.slice(i, q);
        i = q + 1;
        this.quotePending = true;
        continue;
      }
      const ch = chunk[i];
      if (ch === '"' && !this.fieldHadContent && this.field === "") {
        this.inQuotes = true;
        this.fieldHadContent = true;
        i++;
        continue;
      }
      if (ch === ",") {
        this.endField();
        i++;
        continue;
      }
      if (ch === "\n") {
        this.endField();
        this.endRow(emitRow);
        i++;
        continue;
      }
      if (ch === "\r") {
        i++;
        continue;
      }
      if (ch === '"') {
        // Stray quote inside an unquoted field (invalid CSV) — keep literally.
        this.field += '"';
        this.fieldHadContent = true;
        i++;
        continue;
      }
      special.lastIndex = i;
      const m = special.exec(chunk);
      const j = m ? m.index : n;
      this.field += chunk.slice(i, j);
      this.fieldHadContent = true;
      i = j;
    }
  }

  /** Emit any trailing row that isn't newline-terminated. */
  flush(emitRow: (row: string[]) => void): void {
    this.quotePending = false;
    this.inQuotes = false;
    if (this.field !== "" || this.row.length > 0) {
      this.endField();
      this.endRow(emitRow);
    }
  }

  private endField(): void {
    this.row.push(this.field);
    this.field = "";
    this.fieldHadContent = false;
  }

  private endRow(emitRow: (row: string[]) => void): void {
    const row = this.row;
    this.row = [];
    // Skip blank lines (a lone empty field).
    if (row.length === 1 && row[0] === "") return;
    emitRow(row);
  }
}

/**
 * Stream an R2-stored scraped CSV via the OVER download endpoint (302 → R2)
 * and deliver rows as CKANRow-shaped objects (keyed by the CSV header, which
 * uses the same dotted field names as the DataStore) in batches of ~batchSize.
 * Returns the number of data rows delivered. Batches are awaited before more
 * of the response is read, so DB insert speed backpressures the download.
 */
export async function streamR2CsvRows(
  versionId: string,
  onBatch: (rows: CKANRow[]) => Promise<void>,
  batchSize = 500,
): Promise<number> {
  const url = `${OVER_BASE}/versions/${versionId}/download/${encodeURIComponent(RESOURCE_KEY)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body) {
    throw new Error(`streamR2CsvRows: HTTP ${res.status} for version ${versionId}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8"); // streaming decode; strips the BOM
  const parser = new CsvStreamParser();

  let header: string[] | null = null;
  let pending: CKANRow[] = [];
  let delivered = 0;

  const emitRow = (row: string[]): void => {
    if (!header) {
      header = row;
      return;
    }
    const obj: CKANRow = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = row[c] ?? "";
    pending.push(obj);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.write(decoder.decode(value, { stream: true }), emitRow);
    if (pending.length >= batchSize) {
      const batch = pending;
      pending = [];
      delivered += batch.length;
      await onBatch(batch);
    }
  }
  const tail = decoder.decode();
  if (tail) parser.write(tail, emitRow);
  parser.flush(emitRow);
  if (pending.length > 0) {
    delivered += pending.length;
    await onBatch(pending);
  }
  return delivered;
}

/* ─── Public API ─────────────────────────────────────────────────────── */

export async function fetchDatasetRecords(
  datasetId: string,
  source: ArrangementSource,
): Promise<ConditionalArrangement[] | null> {
  const resourceId = await getLatestResourceId(datasetId);
  if (!resourceId) {
    console.error(`conditional-arrangements: no resource ID for dataset ${datasetId}`);
    return null;
  }

  const fields = source === "police" ? POLICE_FIELDS : PROSECUTOR_FIELDS;
  const normalise = source === "police" ? normalisePolice : normaliseProsecutor;

  // Normalise each page immediately so raw CKANRow[] objects (which carry the
  // full description text — up to 10 KB each) are GC'd before the next batch
  // arrives. Peak RAM: 2 in-flight pages × ~12 MB ≈ 24 MB, not 32k rows × 8 KB ≈ 260 MB.
  const first = await fetchCKANPage(resourceId, 0, PAGE_SIZE, fields);
  if (!first) {
    console.error(`conditional-arrangements: failed to fetch CKAN rows for resource ${resourceId}`);
    return null;
  }

  const all: ConditionalArrangement[] = first.records.map((row, i) => normalise(row, i));
  const total = first.total;

  if (all.length >= total) return all;

  const offsets: number[] = [];
  for (let off = PAGE_SIZE; off < total; off += PAGE_SIZE) {
    offsets.push(off);
  }

  let rowIdx = all.length;
  for (let i = 0; i < offsets.length; i += PARALLEL) {
    const batch = offsets.slice(i, i + PARALLEL);
    const pages = await Promise.all(
      batch.map((off) => fetchCKANPage(resourceId, off, PAGE_SIZE, fields)),
    );
    if (pages.some((p) => p === null)) return null;
    for (const page of pages) {
      if (page) {
        for (const row of page.records) all.push(normalise(row, rowIdx++));
        // page.records is now unreferenced — raw rows with full descriptions are GC'd
      }
    }
  }

  return all;
}

/**
 * Fetch the full description text for a single arrangement by its CKAN row ID.
 * Used by the detail API so cards can load full text on demand without keeping
 * 5–10 KB × 33 k records in the server's RAM at all times.
 */
export async function fetchArrangementDetail(
  source: ArrangementSource,
  ckanId: number,
): Promise<string | null> {
  const datasetId = source === "police" ? POLICE_DATASET_ID : PROSECUTOR_DATASET_ID;
  const resourceId = await getLatestResourceId(datasetId);
  if (!resourceId) return null;

  const descField =
    source === "police"
      ? "Data.details.Description_text"
      : "Data.more_info.Description_text";

  const filters = encodeURIComponent(JSON.stringify({ _id: ckanId }));
  const fields = encodeURIComponent(["_id", descField].join(","));
  const url = `${ODATA_BASE}/api/3/action/datastore_search?resource_id=${encodeURIComponent(resourceId)}&filters=${filters}&limit=1&fields=${fields}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as CKANResponse;
  if (!json.success || !json.result.records.length) return null;

  return str(json.result.records[0][descField]) || null;
}

export async function fetchAllArrangements(): Promise<ConditionalArrangement[] | null> {
  const [police, prosecutor] = await Promise.all([
    fetchDatasetRecords(POLICE_DATASET_ID, "police"),
    fetchDatasetRecords(PROSECUTOR_DATASET_ID, "prosecutor"),
  ]);

  // If both fail, return null; if one fails, return what we have
  if (police === null && prosecutor === null) return null;

  const merged = [...(police ?? []), ...(prosecutor ?? [])];

  // Sort newest-first. Records without a date sort to the bottom.
  merged.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return merged;
}
