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

const POLICE_DATASET_ID = "d49264eb-493c-4ab6-8a43-8784f6ae0fbf";
const PROSECUTOR_DATASET_ID = "9fbe426a-4750-4202-94aa-0518fe9e575c";

// Key used in resource_mappings for the scraped CSV resource.
const RESOURCE_KEY = "נתוני הסורק";

const PAGE_SIZE = 1000;
const PARALLEL = 4;

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
type CKANRow = Record<string, string | number | null>;

function str(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}

function normalisePolice(row: CKANRow, rowIdx: number): ConditionalArrangement {
  const descText = str(row["Data.details.Description_text"]);
  const raw: RawRecord = {};
  const branch = str(row["Data.ShemShluchaMetapelet"]);
  const caseNo = str(row["Data.Tikim"]);
  const date = str(row["Data.Taarich"]);
  const heDate = str(row["Data.HeTaarich"]);
  if (branch) raw["שלוחה"] = branch;
  if (caseNo) raw["מספר תיק"] = caseNo;
  if (date) raw["תאריך"] = date;
  if (heDate) raw["תאריך עברי"] = heDate;
  if (descText) raw["תיאור"] = descText;
  return {
    _id: `police:${str(row["_id"]) || rowIdx}`,
    source: "police",
    date: parseDateSlash(date),
    district: branch || null,
    offense: extractOffense(descText),
    fine: extractAmount(descText, FINE_RE),
    compensation: extractAmount(descText, COMP_RE),
    raw,
  };
}

function normaliseProsecutor(row: CKANRow, rowIdx: number): ConditionalArrangement {
  const descText = str(row["Data.more_info.Description_text"]);
  const raw: RawRecord = {};
  const caseNo = str(row["Data.case_number"]);
  const unit = str(row["Data.unit"]);
  const urlName = str(row["UrlName"]);
  if (caseNo) raw["מספר תיק"] = caseNo;
  if (unit) raw["יחידה"] = unit;
  if (urlName) raw["UrlName"] = urlName;
  if (descText) raw["תיאור"] = descText;
  return {
    _id: `prosecutor:${str(row["_id"]) || rowIdx}`,
    source: "prosecutor",
    date: null,
    district: unit || null,
    offense: extractOffense(descText),
    fine: extractAmount(descText, FINE_RE),
    compensation: extractAmount(descText, COMP_RE),
    raw,
  };
}

/* ─── over.org.il — get latest CKAN resource ID ─────────────────────── */

async function getLatestResourceId(datasetId: string): Promise<string | null> {
  const url = `${OVER_BASE}/datasets/${datasetId}/versions?limit=20&ordering=-version_number`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as OverVersionObject[] | { results: OverVersionObject[] };
  const versions = Array.isArray(json) ? json : (json.results ?? []);
  if (!versions.length) return null;
  // Pick the version with the highest version_number
  const latest = versions.reduce((best, v) =>
    v.version_number > best.version_number ? v : best,
  );
  return latest.resource_mappings?.[RESOURCE_KEY] ?? null;
}

/* ─── odata.org.il — CKAN DataStore pagination ───────────────────────── */

interface CKANResponse {
  success: boolean;
  result: {
    total: number;
    records: CKANRow[];
  };
}

async function fetchCKANPage(
  resourceId: string,
  offset: number,
  limit: number,
): Promise<{ records: CKANRow[]; total: number } | null> {
  const url = `${ODATA_BASE}/api/3/action/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as CKANResponse;
  if (!json.success) return null;
  return {
    records: json.result.records,
    total: json.result.total,
  };
}

async function fetchAllCKANRows(resourceId: string): Promise<CKANRow[] | null> {
  // First page — also tells us the total
  const first = await fetchCKANPage(resourceId, 0, PAGE_SIZE);
  if (!first) return null;

  const all: CKANRow[] = [...first.records];
  const total = first.total;

  if (all.length >= total) return all;

  // Build remaining offsets
  const offsets: number[] = [];
  for (let off = PAGE_SIZE; off < total; off += PAGE_SIZE) {
    offsets.push(off);
  }

  // Fetch in parallel batches of PARALLEL
  for (let i = 0; i < offsets.length; i += PARALLEL) {
    const batch = offsets.slice(i, i + PARALLEL);
    const pages = await Promise.all(
      batch.map((off) => fetchCKANPage(resourceId, off, PAGE_SIZE)),
    );
    if (pages.some((p) => p === null)) return null;
    for (const page of pages) {
      if (page) all.push(...page.records);
    }
  }

  return all;
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

  const rows = await fetchAllCKANRows(resourceId);
  if (!rows) {
    console.error(`conditional-arrangements: failed to fetch CKAN rows for resource ${resourceId}`);
    return null;
  }

  const normalise = source === "police" ? normalisePolice : normaliseProsecutor;
  return rows.map((row, i) => normalise(row, i));
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
