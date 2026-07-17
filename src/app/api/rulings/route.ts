import { NextRequest, NextResponse } from "next/server";
import {
  fetchUpstreamRulingsPage,
  fetchUpstreamRulingsSchema,
  fetchAllUpstreamRulings,
  UpstreamError,
  type UpstreamRulingItem,
  type UpstreamSchemaField,
} from "@/lib/rulings-upstream";
import {
  mirrorReady,
  queryMirrorPage,
  queryMirrorBulk,
} from "@/lib/rulings-mirror";
import { getPageContent } from "@/lib/content";
import type {
  DefamationRulingsPageContent,
  FoiRulingsPageContent,
  FoiJudgmentsPageContent,
  FoiCostsPageContent,
  DrugSentencingPageContent,
} from "@/types/content";
import type {
  FilterExpression,
  RulingsFilterField,
  RulingsSortField,
  SortDir,
  LawSectionFilterConfig,
  LawSectionSelection,
} from "@/types/ruling-filter";
import { VALID_FILTER_CONTROLS, LAW_SECTION_FILTER_KEY } from "@/types/ruling-filter";
import { createHash } from "crypto";

// Collapse a law name to the canonical short form used as the map key — drop
// the ", התש..-YYYY" year suffix so variants merge. Mirrors the build script.
function canonLaw(name: string): string {
  return String(name)
    .replace(/,?\s*הת[^,]*?-?\s*\d{4}.*$/u, "")
    .replace(/[\s,]+$/u, "")
    .trim();
}

// Does a document satisfy the law/section selection? Extracts (law, section)
// pairs from the claims field, scopes sections to the chosen law, applies
// OR/AND. Handles BOTH document shapes:
//  • legacy nested: sql[arrayKey] = [{שם_חוק_רשמי, סעיף_החוק, …}, …]
//  • current flat:  TAG-IT's schema stopped advertising the parent key and
//    instead emits parallel leaf arrays under flat dotted keys, e.g.
//    sql["טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי"] = [law, law, …] and
//    sql["טענות_סעיפי_חוק_שנדונו.סעיף_החוק"] = [section, section, …],
//    aligned by element order.
function lawSectionPairs(
  sql: Record<string, unknown>,
  cfg: LawSectionFilterConfig,
): { law: string; section: string }[] {
  const parent = sql[cfg.arrayKey];
  if (Array.isArray(parent)) {
    const elements = parent.filter(
      (x) => x && typeof x === "object",
    ) as Record<string, unknown>[];
    if (elements.length > 0) {
      return elements.map((el) => {
        let law = "";
        for (const k of cfg.lawSubKeys) {
          const v = el[k];
          if (typeof v === "string" && v.trim()) {
            law = canonLaw(v);
            break;
          }
        }
        const sec = el[cfg.sectionSubKey];
        return { law, section: typeof sec === "string" ? sec : "" };
      });
    }
  }
  // Flat parallel arrays.
  const asArr = (v: unknown): unknown[] =>
    Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  let laws: unknown[] = [];
  for (const k of cfg.lawSubKeys) {
    laws = asArr(sql[`${cfg.arrayKey}.${k}`]);
    if (laws.length) break;
  }
  const sections = asArr(sql[`${cfg.arrayKey}.${cfg.sectionSubKey}`]);
  const n = Math.max(laws.length, sections.length);
  const pairs: { law: string; section: string }[] = [];
  for (let i = 0; i < n; i++) {
    pairs.push({
      law: typeof laws[i] === "string" ? canonLaw(laws[i] as string) : "",
      section: typeof sections[i] === "string" ? (sections[i] as string) : "",
    });
  }
  return pairs;
}

function matchesLawSection(
  doc: UpstreamRulingItem,
  sel: LawSectionSelection,
  cfg: LawSectionFilterConfig,
): boolean {
  const sql = ((doc as Record<string, unknown>).sql as Record<string, unknown>) || {};
  const pairs = lawSectionPairs(sql, cfg);
  // Restrict to elements of the chosen law (when a law is selected).
  const scoped = sel.law ? pairs.filter((p) => p.law === sel.law) : pairs;
  if (sel.law && scoped.length === 0) return false;
  const wanted = (sel.sections || []).filter(Boolean);
  if (wanted.length === 0) return true; // law-only filter
  const present = new Set(
    scoped.map((p) => p.section).filter((s) => s.trim() !== ""),
  );
  return sel.mode === "and"
    ? wanted.every((s) => present.has(s))
    : wanted.some((s) => present.has(s));
}

function parseLawSectionSelection(
  userFilters: Record<string, unknown>,
): LawSectionSelection | null {
  const raw = userFilters[LAW_SECTION_FILTER_KEY];
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const law = typeof o.law === "string" ? o.law.trim() : "";
  const sections = Array.isArray(o.sections)
    ? o.sections.map((s) => String(s)).filter(Boolean)
    : [];
  const mode = o.mode === "and" ? "and" : "or";
  if (!law && sections.length === 0) return null;
  return { law: law || undefined, sections, mode };
}

/* ── Drug + quantity match (scope 1) ──
   The quantity refers to the per-drug TOTAL across the whole judgment. TAG-IT
   exposes meta.drug_totals = [{ סוג_הסם (canonical), יחידה, כמות_כוללת,
   מספר_רכיבים }] — grouped + summed per (canonical drug × unit) — so
   "cocaine ≥ 30g" means the SUM of cocaine grams ≥ 30, and cannabis aliases
   (גראס/קנבוס/מריחואנה) are already merged into קנאביס. We match those summed
   GRAMS rows in memory.
   FALLBACK: a doc whose mirror copy predates the field (meta.drug_totals
   absent — stale mirror) falls back to the legacy per-offense-element match
   over the raw sql.פירוט_עבירות_סמים[] — uncorrelated across aliases and
   per-element (not summed), but keeps the filter working until the mirror
   re-syncs the field. */
interface DrugOffenseElem {
  drug: string;
  qty: number | null;
}
function drugOffenseElems(doc: UpstreamRulingItem): DrugOffenseElem[] {
  const sql = ((doc as Record<string, unknown>).sql as Record<string, unknown>) || {};
  const arr = sql["פירוט_עבירות_סמים"];
  if (!Array.isArray(arr)) return [];
  const out: DrugOffenseElem[] = [];
  for (const e of arr) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const drug = typeof o["סוג_הסם"] === "string" ? (o["סוג_הסם"] as string) : "";
    const q = o["מספר_כמות"];
    let qty: number | null = null;
    if (typeof q === "number") qty = q;
    else if (typeof q === "string" && q.trim() !== "" && !Number.isNaN(Number(q))) qty = Number(q);
    out.push({ drug, qty });
  }
  return out;
}
// canonical drug → summed GRAMS total, from meta.drug_totals grams rows only
// (non-mass units and non-numeric marker rows are ignored for a grams filter).
function drugTotalsGrams(metaTotals: unknown): Map<string, number> {
  const m = new Map<string, number>();
  if (!Array.isArray(metaTotals)) return m;
  for (const row of metaTotals) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const drug = o["סוג_הסם"];
    const total = o["כמות_כוללת"];
    if (typeof drug === "string" && o["יחידה"] === "גרם" && typeof total === "number") {
      m.set(drug, (m.get(drug) ?? 0) + total);
    }
  }
  return m;
}
function matchesDrugQuantity(
  doc: UpstreamRulingItem,
  drugs: string[],
  mode: "or" | "and",
  range: { min?: number; max?: number },
): boolean {
  const inRange = (qty: number | null | undefined): boolean => {
    if (qty == null) return false;
    if (range.min != null && qty < range.min) return false;
    if (range.max != null && qty > range.max) return false;
    return true;
  };
  const meta =
    ((doc as Record<string, unknown>).meta as Record<string, unknown>) || {};
  // Preferred path — normalized per-drug SUM. Presence of meta.drug_totals
  // (even []) means TAG-IT computed it for this doc.
  //   AND: every selected drug's grams-total is in range.
  //   OR : some selected drug's grams-total is in range.
  if (Array.isArray(meta["drug_totals"])) {
    const totals = drugTotalsGrams(meta["drug_totals"]);
    return mode === "and"
      ? drugs.every((d) => inRange(totals.get(d)))
      : drugs.some((d) => inRange(totals.get(d)));
  }
  // Fallback — legacy per-offense-element match (stale mirror, field absent).
  const elems = drugOffenseElems(doc);
  return mode === "and"
    ? drugs.every((d) => elems.some((e) => e.drug === d && inRange(e.qty)))
    : elems.some((e) => drugs.includes(e.drug) && inRange(e.qty));
}

// Bulk (law-narrowed) snapshot cache for the in-memory section filter, so we
// don't re-pull the corpus on every page / section toggle.
interface BulkEntry {
  docs: UpstreamRulingItem[];
  ts: number;
  ttl: number;
}
const bulkCache = new Map<string, BulkEntry>();
const BULK_CACHE_MAX = 24;
function bulkGet(key: string): UpstreamRulingItem[] | null {
  const e = bulkCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts >= e.ttl) {
    bulkCache.delete(key);
    return null;
  }
  bulkCache.delete(key);
  bulkCache.set(key, e);
  return e.docs;
}
function bulkSet(key: string, docs: UpstreamRulingItem[], ttl: number) {
  bulkCache.delete(key);
  bulkCache.set(key, { docs, ts: Date.now(), ttl });
  while (bulkCache.size > BULK_CACHE_MAX) {
    const oldest = bulkCache.keys().next().value;
    if (!oldest) break;
    bulkCache.delete(oldest);
  }
}

const SCOPE_MAP: Record<string, { id: number; pageSlug: string }> = {
  defamation:      { id: 4, pageSlug: "defamation-rulings" },
  // foi kept for backward compat with anything still calling the old key.
  foi:             { id: 6, pageSlug: "foi-rulings" },
  "foi-judgments": { id: 6, pageSlug: "foi-judgments" },
  "foi-costs":     { id: 6, pageSlug: "foi-costs" },
  "drug-sentencing": { id: 1, pageSlug: "drug-sentencing" },
};

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

interface NormalizedRuling {
  id: number;
  caseName: string;
  court: string;
  judges: string[];
  date: string;
  summary: string;
  title: string;
  documentUrl: string;
  // Flattened lookup of every field on the document so the client can render
  // admin-configured displayFields by key (e.g. "sql.הוצאות_משפט").
  fields: Record<string, unknown>;
}

function pickString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function pickArray(...vals: unknown[]): string[] {
  for (const v of vals) {
    if (Array.isArray(v)) return v.map((x) => String(x));
  }
  return [];
}

// Recursively flatten a nested object into dotted keys, so both the parent
// ("sql.היבטים_פיננסיים") and the leaves ("sql.היבטים_פיננסיים.סכום_פיצוי_נפסק")
// are addressable — matching the keys TAG-IT's schema endpoint advertises.
// Arrays are kept as-is (rendered joined), not exploded by index.
function flattenInto(
  out: Record<string, unknown>,
  prefix: string,
  obj: Record<string, unknown>,
) {
  for (const [k, v] of Object.entries(obj)) {
    const key = `${prefix}.${k}`;
    out[key] = v;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flattenInto(out, key, v as Record<string, unknown>);
    }
  }
}

function flattenFields(doc: UpstreamRulingItem): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const top = doc as Record<string, unknown>;
  // ai.* — supports both the legacy `ai_analysis` and the new `ai` grouping
  const ai = ((top.ai || top.ai_analysis) as Record<string, unknown>) || {};
  flattenInto(out, "ai", ai);
  // sql.*
  const sql = (top.sql as Record<string, unknown>) || {};
  flattenInto(out, "sql", sql);
  // meta.* — the new shape nests the promoted document columns under a
  // `meta` object. Flatten it; fall back to bare top-level keys for legacy.
  const metaObj = (top.meta as Record<string, unknown>) || {};
  flattenInto(out, "meta", metaObj);
  const skip = new Set(["ai", "ai_analysis", "sql", "meta"]);
  for (const k of Object.keys(top)) {
    if (skip.has(k)) continue;
    if (out[`meta.${k}`] === undefined) out[`meta.${k}`] = top[k];
  }
  return out;
}

function normalize(doc: UpstreamRulingItem): NormalizedRuling {
  const top = doc as Record<string, unknown>;
  const ai = ((top.ai || top.ai_analysis) as Record<string, unknown>) || {};
  const meta = (top.meta as Record<string, unknown>) || {};
  return {
    id: doc.id,
    caseName:
      pickString(
        ai["שם_התיק"],
        meta.case_name,
        top.case_name,
        doc.filename,
      ) || "ללא שם",
    court: pickString(ai["בית_משפט"], meta.court_name, top.court),
    judges: pickArray(ai["שופטים"], top.judges),
    date: pickString(ai["תאריך_המסמך"], meta.document_date, top.date),
    summary: pickString(ai["תקציר"], ai["תקציר_המסמך"], top.summary),
    title: pickString(ai["כותרת_המסמך"], meta.document_title, top.title),
    // Point at our proxy route, not the upstream /documents/{id}/view (that
    // endpoint requires session auth and would 401 for public visitors).
    documentUrl: `/api/rulings/documents/${doc.id}/file`,
    fields: flattenFields(doc),
  };
}

interface PageConfig {
  ttlMs: number;
  allowedDocTypes: string[];
  customQuery: FilterExpression | null;
  displayFields: string[];
  filterFields: RulingsFilterField[];
  sortFields: RulingsSortField[];
  lawSectionFilter: LawSectionFilterConfig | null;
  scope: number; // 0 = use the per-category default
  pageSize: number;
  initialPageSize: number; // 0 = none → always use pageSize
  fullTextSearch: boolean; // show a free-text content search box (text_query)
}

function readLawSectionFilter(q: unknown): LawSectionFilterConfig | null {
  if (!q || typeof q !== "object") return null;
  const ls = (q as { lawSectionFilter?: unknown }).lawSectionFilter;
  if (!ls || typeof ls !== "object") return null;
  const o = ls as Record<string, unknown>;
  if (
    typeof o.arrayKey !== "string" ||
    typeof o.sectionSubKey !== "string" ||
    !o.map ||
    typeof o.map !== "object"
  ) {
    return null;
  }
  return {
    label: typeof o.label === "string" ? o.label : "סינון לפי חוק וסעיף",
    arrayKey: o.arrayKey,
    lawSubKeys: Array.isArray(o.lawSubKeys)
      ? o.lawSubKeys.map((s) => String(s)).filter(Boolean)
      : [],
    sectionSubKey: o.sectionSubKey,
    upstreamLawField:
      typeof o.upstreamLawField === "string" ? o.upstreamLawField : "",
    map: o.map as Record<string, string[]>,
    lawOrder: Array.isArray(o.lawOrder)
      ? o.lawOrder.map((s) => String(s)).filter(Boolean)
      : undefined,
  };
}

// 24 = LCM(2,3,4) — full rows at every grid breakpoint (1/2/3/4 cols).
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

async function readPageConfig(pageSlug: string): Promise<PageConfig> {
  try {
    let content:
      | FoiRulingsPageContent
      | FoiJudgmentsPageContent
      | FoiCostsPageContent
      | DrugSentencingPageContent
      | DefamationRulingsPageContent;
    switch (pageSlug) {
      case "foi-judgments":
        content =
          await getPageContent<FoiJudgmentsPageContent>("foi-judgments");
        break;
      case "foi-costs":
        content = await getPageContent<FoiCostsPageContent>("foi-costs");
        break;
      case "foi-rulings":
        content = await getPageContent<FoiRulingsPageContent>("foi-rulings");
        break;
      case "drug-sentencing":
        content =
          await getPageContent<DrugSentencingPageContent>("drug-sentencing");
        break;
      default:
        content = await getPageContent<DefamationRulingsPageContent>(
          "defamation-rulings",
        );
    }
    const ttlRaw = Number(content?.cacheTtlMinutes);
    const ttlMinutes = Number.isFinite(ttlRaw)
      ? Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, ttlRaw))
      : DEFAULT_TTL_MINUTES;
    const allowed = Array.isArray(content?.allowedDocTypes)
      ? content.allowedDocTypes.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const customQuery =
      content?.query && typeof content.query === "object"
        ? (content.query.customQuery ?? null)
        : null;
    const displayFields =
      content?.query && Array.isArray(content.query.displayFields)
        ? content.query.displayFields
            .map((s) => String(s).trim())
            .filter(Boolean)
        : [];
    const filterFields =
      content?.query && Array.isArray(content.query.filterFields)
        ? content.query.filterFields.filter(
            (f): f is RulingsFilterField =>
              !!f &&
              typeof f.key === "string" &&
              f.key.trim() !== "" &&
              VALID_FILTER_CONTROLS.includes(f.control),
          )
        : [];
    const sortFields =
      content?.query && Array.isArray(content.query.sortFields)
        ? content.query.sortFields.filter(
            (s): s is RulingsSortField =>
              !!s && typeof s.key === "string" && s.key.trim() !== "",
          )
        : [];
    const scopeRaw = Number(content?.query?.scope);
    const scope = Number.isInteger(scopeRaw) && scopeRaw > 0 ? scopeRaw : 0;
    const sizeRaw = Number(content?.query?.pageSize);
    const pageSize =
      Number.isFinite(sizeRaw) && sizeRaw > 0
        ? Math.min(MAX_PAGE_SIZE, Math.floor(sizeRaw))
        : DEFAULT_PAGE_SIZE;
    const initRaw = Number(content?.query?.initialPageSize);
    const initialPageSize =
      Number.isFinite(initRaw) && initRaw > 0
        ? Math.min(MAX_PAGE_SIZE, Math.floor(initRaw))
        : 0; // 0 = none → always use pageSize
    return {
      ttlMs: ttlMinutes * 60_000,
      allowedDocTypes: allowed,
      customQuery,
      displayFields,
      filterFields,
      sortFields,
      lawSectionFilter: readLawSectionFilter(content?.query),
      scope,
      pageSize,
      initialPageSize,
      fullTextSearch: content?.query?.fullTextSearch === true,
    };
  } catch {
    return {
      ttlMs: DEFAULT_TTL_MINUTES * 60_000,
      allowedDocTypes: [],
      customQuery: null,
      displayFields: [],
      filterFields: [],
      sortFields: [],
      lawSectionFilter: null,
      scope: 0,
      pageSize: DEFAULT_PAGE_SIZE,
      initialPageSize: 0,
      fullTextSearch: false,
    };
  }
}

/* ── User-facing filters ──
   The admin configures which fields are filterable (config.filterFields);
   the user's selections arrive as a JSON object keyed by field key. We apply
   them in memory on top of the admin's customQuery. Shapes per control:
     text   → "substring"
     select → "exact value"
     number → { min?: number, max?: number }
     date   → { from?: "YYYY-MM-DD", to?: "YYYY-MM-DD" }
*/
type UserFilterValue =
  | string
  | string[]
  | { min?: number; max?: number }
  | { from?: string; to?: string };

function parseUserFilters(raw: string | null): Record<string, UserFilterValue> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}


/* ── GET /api/rulings?category=defamation|foi&page=1&limit=12 ── */

// Map the admin's filterFields + the user's selections into upstream filter
// clauses, so the user's narrowing happens at TAG-IT (server-side pagination),
// not in memory.
function userFilterClauses(
  filterFields: RulingsFilterField[],
  userFilters: Record<string, UserFilterValue>,
): FilterExpression[] {
  const clauses: FilterExpression[] = [];
  for (const f of filterFields) {
    const v = userFilters[f.key];
    if (v == null) continue;
    if (f.control === "text") {
      const s = String(v).trim();
      if (s) {
        const op = f.matchOp === "eq" ? "eq" : "contains";
        clauses.push({ field: f.key, op, value: s });
      }
    } else if (f.control === "select") {
      const s = String(v).trim();
      if (s) {
        // Default is exact match; "contains" is the opt-in escape hatch for
        // noisy fields with a curated option list (e.g. court-name → city).
        const op = f.matchOp === "contains" ? "contains" : "eq";
        clauses.push({ field: f.key, op, value: s });
      }
    } else if (f.control === "multiselect") {
      // Several chosen values over a GIN array field. Two modes, chosen by the
      // user via a sidecar key `<field>::mode`:
      //   "or"  (default) → `in`  → array contains ANY of the values.
      //   "and"           → AND of `contains` → array contains ALL of them.
      const arr = Array.isArray(v)
        ? v.map((x) => String(x).trim()).filter(Boolean)
        : [];
      if (arr.length) {
        const mode = userFilters[`${f.key}::mode`];
        if (mode === "and" && arr.length > 1) {
          clauses.push({
            op: "and",
            clauses: arr.map((val) => ({ field: f.key, op: "contains", value: val })),
          });
        } else {
          clauses.push({ field: f.key, op: "in", value: arr });
        }
      }
    } else if (f.control === "boolean") {
      const s = String(v).trim();
      if (s === "true") clauses.push({ field: f.key, op: "eq", value: true });
      else if (s === "false")
        clauses.push({ field: f.key, op: "eq", value: false });
    } else if (f.control === "number") {
      const r = (typeof v === "object" ? v : {}) as { min?: number; max?: number };
      if (r.min != null) clauses.push({ field: f.key, op: "ge", value: r.min });
      if (r.max != null) clauses.push({ field: f.key, op: "le", value: r.max });
    } else if (f.control === "date" || f.control === "yearrange") {
      // yearrange stores ISO year-boundary dates (YYYY-01-01 … YYYY-12-31), so
      // it's the same ge/le date range as a plain date filter.
      const r = (typeof v === "object" ? v : {}) as { from?: string; to?: string };
      if (r.from) clauses.push({ field: f.key, op: "ge", value: r.from });
      if (r.to) clauses.push({ field: f.key, op: "le", value: r.to });
    }
  }
  return clauses;
}

function combineFilters(
  base: FilterExpression | null,
  clauses: FilterExpression[],
): FilterExpression | null {
  const all: FilterExpression[] = [];
  if (base) all.push(base);
  all.push(...clauses);
  if (all.length === 0) return null;
  if (all.length === 1) return all[0];
  return { op: "and", clauses: all };
}

// Per-scope schema cache (for select-filter dropdown values), so we don't hit
// TAG-IT's schema endpoint on every request.
const schemaCache = new Map<number, { fields: UpstreamSchemaField[]; ts: number }>();
const SCHEMA_TTL_MS = 30 * 60_000;
async function getScopeSchema(scopeId: number): Promise<UpstreamSchemaField[]> {
  const c = schemaCache.get(scopeId);
  if (c && Date.now() - c.ts < SCHEMA_TTL_MS) return c.fields;
  const fields = (await fetchUpstreamRulingsSchema(scopeId).catch(() => null)) || [];
  schemaCache.set(scopeId, { fields, ts: Date.now() });
  return fields;
}

function selectOptionsFromSchema(
  fields: UpstreamSchemaField[],
  filterFields: RulingsFilterField[],
): Record<string, string[]> {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const out: Record<string, string[]> = {};
  for (const ff of filterFields) {
    if (ff.control !== "select" && ff.control !== "multiselect") continue;
    // Admin-provided fixed options win over upstream enum samples.
    if (Array.isArray(ff.options) && ff.options.length > 0) {
      out[ff.key] = ff.options.map((v) => String(v)).filter(Boolean);
      continue;
    }
    const sf = byKey.get(ff.key);
    out[ff.key] = (sf?.enum_values_sample || [])
      .map((v) => String(v))
      .filter(Boolean);
  }
  return out;
}

// Tiny TTL cache for page responses (each ~`size` docs). Keyed by the full
// query so pagination/refresh doesn't hammer TAG-IT.
interface PageCacheEntry {
  items: UpstreamRulingItem[];
  total: number;
  ts: number;
  ttl: number;
}
const pageCache = new Map<string, PageCacheEntry>();
const PAGE_CACHE_MAX = 60;
function pageCacheGet(key: string): PageCacheEntry | null {
  const e = pageCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts >= e.ttl) {
    pageCache.delete(key);
    return null;
  }
  pageCache.delete(key);
  pageCache.set(key, e); // LRU touch
  return e;
}
function pageCacheSet(key: string, items: UpstreamRulingItem[], total: number, ttl: number) {
  pageCache.delete(key);
  pageCache.set(key, { items, total, ts: Date.now(), ttl });
  while (pageCache.size > PAGE_CACHE_MAX) {
    const oldest = pageCache.keys().next().value;
    if (!oldest) break;
    pageCache.delete(oldest);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Every distinct filter combination is a fresh cache key, so varying the
    // params forces unbounded TAG-IT/DB query storms. Throttle per IP first.
    const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
    const limited = rateLimit(`rulings:${getClientIp(req)}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "defamation";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const scope = SCOPE_MAP[category];
    if (!scope) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }

    const config = await readPageConfig(scope.pageSlug);
    const scopeId = config.scope > 0 ? config.scope : scope.id;

    const needsSchemaOptions = config.filterFields.some(
      (f) => f.control === "select" || f.control === "multiselect",
    );

    // ── Config-only (?meta=1) ──
    // Returns just the filter/sort config (no TAG-IT document query), so the
    // client can render the filter bar IMMEDIATELY while the (possibly slow)
    // results load in a second request.
    if (searchParams.get("meta") === "1") {
      const schemaFields = needsSchemaOptions ? await getScopeSchema(scopeId) : [];
      return NextResponse.json(
        {
          configOnly: true,
          displayFields: config.displayFields,
          filterFields: config.filterFields,
          filterOptions: selectOptionsFromSchema(schemaFields, config.filterFields),
          sortFields: config.sortFields,
          fullTextSearch: config.fullTextSearch,
          lawSectionFilter: config.lawSectionFilter
            ? {
                label: config.lawSectionFilter.label,
                map: config.lawSectionFilter.map,
                lawOrder: config.lawSectionFilter.lawOrder,
              }
            : undefined,
        },
        {
          // Config changes rarely (admin edits) → cache it longer; the filter
          // bar then renders instantly on repeat/returning loads.
          headers: {
            "Cache-Control":
              "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
          },
        },
      );
    }

    // Smaller first page (initialPageSize) until the user applies a filter.
    const hasUserFilters = !!searchParams.get("userFilters");
    const size =
      !hasUserFilters && config.initialPageSize > 0
        ? config.initialPageSize
        : config.pageSize;

    // ── Build the upstream filter ──
    // Base = admin customQuery, else synthesized from allowedDocTypes (so
    // TAG-IT filters to e.g. only "פסק דין" server-side). User filterFields
    // selections are ANDed on top — all filtering happens at TAG-IT, so we
    // only ever pull ONE page of `size` documents (no bulk fetch / OOM).
    const baseFilter: FilterExpression | null = config.customQuery
      ? config.customQuery
      : config.allowedDocTypes.length > 0
        ? {
            op: "or",
            clauses: config.allowedDocTypes.map((p) => ({
              field: "ai.כותרת_המסמך",
              op: "contains" as const,
              value: p,
            })),
          }
        : null;
    const userFilters = parseUserFilters(searchParams.get("userFilters"));
    const combined = combineFilters(
      baseFilter,
      userFilterClauses(config.filterFields, userFilters),
    );
    const filterJson = combined ? JSON.stringify(combined) : "";

    // ── Free-text search over the document content (TAG-IT text_query) ──
    // Optional general search across the whole document text, independent of the
    // structured field filters.
    const textQuery = searchParams.get("text")?.trim() || "";

    // ── Sort ──
    // Honour a user-chosen sort field (validated against the configured list).
    // Otherwise send nothing and rely on TAG-IT's default newest-first order.
    const reqSort = searchParams.get("sort") || "";
    const reqDir: SortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
    let sortKey = "";
    if (reqSort && config.sortFields.some((s) => s.key === reqSort)) {
      sortKey = (reqDir === "asc" ? "" : "-") + reqSort;
    } else if (textQuery) {
      // A free-text search → send NO sort, so TAG-IT uses its fast default order
      // for text_query (newest-first). The configured default sort (e.g.
      // severity) combined with text_query times out, and `sort=relevance` is
      // rejected upstream (unknown_field), so neither can be used here.
      sortKey = "";
    } else if (!reqSort && config.sortFields[0]?.defaultDir) {
      // No explicit sort from the client → apply the first configured sort's
      // default direction server-side, so the initial page load is ordered by
      // it (the client can't send it on the first fetch — it doesn't know the
      // sortFields config until the response arrives).
      const def = config.sortFields[0];
      sortKey = (def.defaultDir === "asc" ? "" : "-") + def.key;
    }
    // Decomposed form for the local-mirror query ("" → default newest-first).
    const sortDesc = !sortKey || sortKey.startsWith("-");
    const sortField = sortKey ? sortKey.replace(/^-/, "") : null;

    const lawSectionResponse = config.lawSectionFilter
      ? {
          label: config.lawSectionFilter.label,
          map: config.lawSectionFilter.map,
          lawOrder: config.lawSectionFilter.lawOrder,
        }
      : undefined;

    // ── In-app law/section filter path ──
    // TAG-IT can't match the parenthesised section values, so when the user
    // picks a law and/or sections we narrow upstream by law (contains, which
    // is paren-free and safe), pull the bulk snapshot, then filter + paginate
    // the section match (OR/AND) in memory.
    const lsSel = config.lawSectionFilter
      ? parseLawSectionSelection(userFilters)
      : null;
    if (config.lawSectionFilter && lsSel) {
      const cfg = config.lawSectionFilter;
      const narrowClauses: FilterExpression[] = [];
      if (lsSel.law && cfg.upstreamLawField) {
        narrowClauses.push({
          field: cfg.upstreamLawField,
          op: "contains",
          value: lsSel.law,
        });
      }
      const narrowFilter = combineFilters(combined, narrowClauses);
      const narrowJson = narrowFilter ? JSON.stringify(narrowFilter) : "";
      const bulkKey = `s${scopeId}|${createHash("sha1")
        .update(narrowJson + "|" + sortKey)
        .digest("hex")
        .slice(0, 16)}`;
      let docs = bulkGet(bulkKey);
      let bulkSource = "BULK";
      // Local mirror first — the upstream crawl (30 pages × ~1s, or much
      // worse when TAG-IT is loaded) becomes a single indexed SQL query.
      if (!docs && (await mirrorReady(scopeId))) {
        try {
          docs = await queryMirrorBulk({
            scopeId,
            filter: narrowFilter,
            sortKey: sortField,
            sortDesc,
          });
          bulkSource = "MIRROR-BULK";
          bulkSet(bulkKey, docs, config.ttlMs);
        } catch (err) {
          console.error(
            "rulings mirror bulk query failed; falling back to upstream:",
            err,
          );
          docs = null;
        }
      }
      if (!docs) {
        try {
          docs = await fetchAllUpstreamRulings({
            scopeId,
            filterJson: narrowJson || undefined,
            sortKey: sortKey || "-meta.document_date",
          });
        } catch (err) {
          if (err instanceof UpstreamError) {
            return NextResponse.json(
              {
                error: "שגיאה ב-TAG-IT",
                upstreamStatus: err.status,
                upstreamBody: err.body.slice(0, 500),
              },
              { status: 502 },
            );
          }
          throw err;
        }
        if (docs === null) {
          return NextResponse.json(
            {
              error: "שגיאה בטעינת פסיקה",
              detail: "RULINGS_API_KEY (or CLASS_ACTION_API_KEY) not configured",
            },
            { status: 502 },
          );
        }
        bulkSet(bulkKey, docs, config.ttlMs);
      }
      const matched = docs.filter((d) => matchesLawSection(d, lsSel, cfg));
      const start = (page - 1) * size;
      const pageItems = matched.slice(start, start + size);
      const schemaFieldsLs = needsSchemaOptions
        ? await getScopeSchema(scopeId)
        : [];
      return NextResponse.json(
        {
          total: matched.length,
          page,
          size,
          rulings: pageItems.map(normalize),
          displayFields: config.displayFields,
          filterFields: config.filterFields,
          filterOptions: selectOptionsFromSchema(schemaFieldsLs, config.filterFields),
          sortFields: config.sortFields,
          fullTextSearch: config.fullTextSearch,
          lawSectionFilter: lawSectionResponse,
        },
        {
          headers: {
            "Cache-Control":
              "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
            "X-Cache": bulkSource,
          },
        },
      );
    }

    // ── Correlated drug + quantity path ──
    // When the user picks drug type(s) AND a quantity range, the two must refer
    // to the SAME drug (see matchesDrugQuantity). We narrow upstream by
    // everything EXCEPT the (uncorrelated) quantity clause — keeping the drug
    // presence filter, which is indexed — then match the drug↔quantity pairing
    // in memory over the (mirror-backed) bulk snapshot and paginate.
    const drugSelRaw = userFilters["meta.drug_types"];
    const drugSel = Array.isArray(drugSelRaw)
      ? drugSelRaw.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const qtyRaw = userFilters["meta.drug_max_grams"];
    const qtyRange =
      qtyRaw && typeof qtyRaw === "object" && !Array.isArray(qtyRaw)
        ? (qtyRaw as { min?: number; max?: number })
        : {};
    const hasQty = qtyRange.min != null || qtyRange.max != null;
    const drugMode: "or" | "and" =
      userFilters["meta.drug_types::mode"] === "and" ? "and" : "or";
    if (drugSel.length > 0 && hasQty) {
      // Narrow filter = base + all user clauses EXCEPT the quantity field.
      const narrowFilter = combineFilters(
        baseFilter,
        userFilterClauses(
          config.filterFields.filter((f) => f.key !== "meta.drug_max_grams"),
          userFilters,
        ),
      );
      const narrowJson = narrowFilter ? JSON.stringify(narrowFilter) : "";
      const bulkKey = `s${scopeId}|dq|${createHash("sha1")
        .update(narrowJson + "|" + sortKey)
        .digest("hex")
        .slice(0, 16)}`;
      let docs = bulkGet(bulkKey);
      let bulkSource = "BULK";
      if (!docs && (await mirrorReady(scopeId))) {
        try {
          docs = await queryMirrorBulk({
            scopeId,
            filter: narrowFilter,
            sortKey: sortField,
            sortDesc,
          });
          bulkSource = "MIRROR-BULK";
          bulkSet(bulkKey, docs, config.ttlMs);
        } catch (err) {
          console.error("rulings drug-qty mirror bulk failed; upstream fallback:", err);
          docs = null;
        }
      }
      if (!docs) {
        try {
          docs = await fetchAllUpstreamRulings({
            scopeId,
            filterJson: narrowJson || undefined,
            sortKey: sortKey || "-meta.document_date",
          });
        } catch (err) {
          if (err instanceof UpstreamError) {
            return NextResponse.json(
              {
                error: "שגיאה ב-TAG-IT",
                upstreamStatus: err.status,
                upstreamBody: err.body.slice(0, 500),
              },
              { status: 502 },
            );
          }
          throw err;
        }
        if (docs === null) {
          return NextResponse.json(
            {
              error: "שגיאה בטעינת פסיקה",
              detail: "RULINGS_API_KEY (or CLASS_ACTION_API_KEY) not configured",
            },
            { status: 502 },
          );
        }
        bulkSet(bulkKey, docs, config.ttlMs);
      }
      const matched = docs.filter((d) =>
        matchesDrugQuantity(d, drugSel, drugMode, qtyRange),
      );
      const start = (page - 1) * size;
      const pageItems = matched.slice(start, start + size);
      const schemaFieldsDq = needsSchemaOptions ? await getScopeSchema(scopeId) : [];
      return NextResponse.json(
        {
          total: matched.length,
          page,
          size,
          rulings: pageItems.map(normalize),
          displayFields: config.displayFields,
          filterFields: config.filterFields,
          filterOptions: selectOptionsFromSchema(schemaFieldsDq, config.filterFields),
          sortFields: config.sortFields,
          fullTextSearch: config.fullTextSearch,
          lawSectionFilter: lawSectionResponse,
        },
        {
          headers: {
            "Cache-Control":
              "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
            "X-Cache": bulkSource,
          },
        },
      );
    }

    // ── Fetch ONE page (with a small TTL cache) ──
    const cacheKey = `s${scopeId}|sz${size}|p${page}|${createHash("sha1")
      .update(filterJson + "|" + sortKey + "|" + textQuery)
      .digest("hex")
      .slice(0, 16)}`;
    let entry = pageCacheGet(cacheKey);
    let cacheStatus = entry ? "HIT" : "MISS";
    if (!entry) {
      // ── Local mirror first ──
      // Serves the page from OUR Postgres in tens of ms. text_query is the
      // exception — full-text search needs the document text, which only
      // TAG-IT holds. Any mirror failure falls through to the upstream path.
      if (!textQuery && (await mirrorReady(scopeId))) {
        try {
          const res = await queryMirrorPage({
            scopeId,
            page,
            size,
            filter: combined,
            sortKey: sortField,
            sortDesc,
          });
          pageCacheSet(cacheKey, res.items, res.total, config.ttlMs);
          entry = { items: res.items, total: res.total, ts: Date.now(), ttl: config.ttlMs };
          cacheStatus = "MIRROR";
        } catch (err) {
          console.error(
            "rulings mirror page query failed; falling back to upstream:",
            err,
          );
        }
      }
    }
    if (!entry) {
      try {
        const res = await fetchUpstreamRulingsPage({
          scopeId,
          page,
          size,
          filterJson: filterJson || undefined,
          sortKey: sortKey || undefined,
          textQuery: textQuery || undefined,
        });
        if (res === null) {
          return NextResponse.json(
            {
              error: "שגיאה בטעינת פסיקה",
              detail: "RULINGS_API_KEY (or CLASS_ACTION_API_KEY) not configured",
            },
            { status: 502 },
          );
        }
        pageCacheSet(cacheKey, res.items, res.total, config.ttlMs);
        entry = { items: res.items, total: res.total, ts: Date.now(), ttl: config.ttlMs };
        cacheStatus = "MISS";
      } catch (err) {
        if (err instanceof UpstreamError) {
          return NextResponse.json(
            {
              error: "שגיאה ב-TAG-IT",
              upstreamStatus: err.status,
              upstreamBody: err.body.slice(0, 500),
            },
            { status: 502 },
          );
        }
        throw err;
      }
    }

    const rulings = entry.items.map(normalize);

    // Select dropdown values come from the scope schema (enum samples), not a
    // corpus scan — cheap and cached.
    const schemaFields = needsSchemaOptions
      ? await getScopeSchema(scopeId)
      : [];
    const filterOptions = selectOptionsFromSchema(schemaFields, config.filterFields);

    return NextResponse.json(
      {
        total: entry.total,
        page,
        size,
        rulings,
        displayFields: config.displayFields,
        filterFields: config.filterFields,
        filterOptions,
        sortFields: config.sortFields,
        fullTextSearch: config.fullTextSearch,
        lawSectionFilter: lawSectionResponse,
      },
      {
        headers: {
          // Public rulings data — let the browser/CDN cache it so repeat loads,
          // pagination-back, and other users' identical queries are instant.
          // stale-while-revalidate serves the cached copy immediately while a
          // fresh one is fetched in the background.
          "Cache-Control":
            "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
          "X-Cache": cacheStatus,
        },
      },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Rulings API error:", detail);
    return NextResponse.json(
      { error: "שגיאה בטעינת פסיקה", detail },
      { status: 500 },
    );
  }
}
