import type {
  ConditionalArrangement,
  ArrangementSource,
  OverVersionObject,
  RawRecord,
} from "@/types/conditional-arrangement";

const OVER_BASE = "https://www.over.org.il/api";
const POLICE_DATASET_ID = "d49264eb-493c-4ab6-8a43-8784f6ae0fbf";
const PROSECUTOR_DATASET_ID = "9fbe426a-4750-4202-94aa-0518fe9e575c";
// Resource name key used in over.org.il resource_mappings for scraped datasets.
const RESOURCE_KEY = "נתוני הסורק";
const PAGE_SIZE = 500;
const PARALLEL = 4;

/* ─── Field-name normalisation map ────────────────────────────────────
 * over.org.il CSV column names are in Hebrew and may differ between the
 * police and prosecutor datasets. Each normalised field tries several
 * known variants in order and takes the first non-empty value.
 * Unknown fields are kept verbatim inside `raw` so they are always
 * visible in the card's expanded section and are searchable via ?q=.
 * ─────────────────────────────────────────────────────────────────── */

const DATE_KEYS = [
  "תאריך",
  "תאריך הסדר",
  "תאריך חתימה",
  "תאריך פתיחת תיק",
  "תאריך ביצוע ההסדר",
  "תאריך עדכון",
];

const OFFENSE_KEYS = [
  "עבירה",
  "סוג עבירה",
  "תיאור עבירה",
  "עבירות",
  "עבירה עיקרית",
];

const DISTRICT_KEYS = [
  "מחוז",
  "מחוז פרקליטות",
  "יחידה",
  "תחנה",
  "מחוז משטרה",
  "יחידת חקירות",
];

const FINE_KEYS = ["קנס", "סכום קנס", 'קנס (ש"ח)', "סכום קנס ₪"];
const COMPENSATION_KEYS = ["פיצוי", "סכום פיצוי", 'פיצוי (ש"ח)', "סכום פיצוי ₪"];

function pickFirst(raw: RawRecord, keys: string[]): string | null {
  for (const k of keys) {
    const v = raw[k];
    if (v != null && v.trim() !== "") return v.trim();
  }
  return null;
}

function parseDate(raw: RawRecord): string | null {
  const s = pickFirst(raw, DATE_KEYS);
  if (!s) return null;
  // Try common Israeli date formats: DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dot) return `${dot[3]}-${dot[2].padStart(2, "0")}-${dot[1].padStart(2, "0")}`;
  // If already ISO-like or parseable, return as-is
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseNumber(raw: RawRecord, keys: string[]): number | null {
  const s = pickFirst(raw, keys);
  if (!s) return null;
  // Strip currency symbols, commas, spaces
  const cleaned = s.replace(/[₪,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normaliseRecord(
  raw: RawRecord,
  source: ArrangementSource,
  index: number,
): ConditionalArrangement {
  return {
    _id: `${source}:${index}`,
    source,
    date: parseDate(raw),
    offense: pickFirst(raw, OFFENSE_KEYS),
    district: pickFirst(raw, DISTRICT_KEYS),
    fine: parseNumber(raw, FINE_KEYS),
    compensation: parseNumber(raw, COMPENSATION_KEYS),
    raw,
  };
}

/* ─── over.org.il API helpers ─────────────────────────────────────── */

async function getLatestResourceId(datasetId: string): Promise<string | null> {
  const url = `${OVER_BASE}/datasets/${datasetId}/versions?limit=1&ordering=-version_number`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as OverVersionObject[] | { results: OverVersionObject[] };
  const versions = Array.isArray(json) ? json : json.results ?? [];
  if (!versions.length) return null;
  const latest = versions[0];
  const resourceId = latest.resource_mappings?.[RESOURCE_KEY];
  return resourceId ?? null;
}

interface OverDataResponse {
  total?: number;
  count?: number;
  results?: RawRecord[];
  data?: RawRecord[];
}

async function fetchPage(
  resourceId: string,
  offset: number,
): Promise<OverDataResponse | null> {
  const url = `${OVER_BASE}/resources/${resourceId}/data?limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as OverDataResponse;
}

export async function fetchDatasetRecords(
  datasetId: string,
  source: ArrangementSource,
): Promise<ConditionalArrangement[] | null> {
  const resourceId = await getLatestResourceId(datasetId);
  if (!resourceId) return null;

  const first = await fetchPage(resourceId, 0);
  if (!first) return null;

  const rows: RawRecord[] = [...(first.results ?? first.data ?? [])];
  const total = first.total ?? first.count ?? rows.length;
  if (rows.length >= total) {
    return rows.map((r, i) => normaliseRecord(r, source, i));
  }

  const actualPageSize = rows.length || PAGE_SIZE;
  const offsets: number[] = [];
  for (let off = actualPageSize; off < total; off += actualPageSize) {
    offsets.push(off);
  }

  for (let i = 0; i < offsets.length; i += PARALLEL) {
    const batch = offsets.slice(i, i + PARALLEL);
    const pages = await Promise.all(batch.map((off) => fetchPage(resourceId, off)));
    if (pages.some((p) => p === null)) return null;
    for (const page of pages) {
      if (page) rows.push(...(page.results ?? page.data ?? []));
    }
  }

  return rows.map((r, i) => normaliseRecord(r, source, i));
}

/* ─── Combined fetch for both sources ────────────────────────────── */

export async function fetchAllArrangements(): Promise<
  ConditionalArrangement[] | null
> {
  const [police, prosecutor] = await Promise.all([
    fetchDatasetRecords(POLICE_DATASET_ID, "police"),
    fetchDatasetRecords(PROSECUTOR_DATASET_ID, "prosecutor"),
  ]);

  // If both fail, return null; if one fails, return what we have.
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
