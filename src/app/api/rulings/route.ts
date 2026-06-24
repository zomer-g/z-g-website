import { NextRequest, NextResponse } from "next/server";
import {
  fetchUpstreamRulingsPage,
  fetchUpstreamRulingsSchema,
  fetchAllUpstreamRulings,
  UpstreamError,
  type UpstreamRulingItem,
  type UpstreamSchemaField,
} from "@/lib/rulings-upstream";
import { getPageContent } from "@/lib/content";
import type {
  DefamationRulingsPageContent,
  FoiRulingsPageContent,
  FoiJudgmentsPageContent,
  FoiCostsPageContent,
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

// Does a document satisfy the law/section selection? Reads the array field,
// scopes sections to elements matching the chosen law, and applies OR/AND.
function matchesLawSection(
  doc: UpstreamRulingItem,
  sel: LawSectionSelection,
  cfg: LawSectionFilterConfig,
): boolean {
  const sql = ((doc as Record<string, unknown>).sql as Record<string, unknown>) || {};
  const arr = sql[cfg.arrayKey];
  const elements = Array.isArray(arr)
    ? (arr.filter((x) => x && typeof x === "object") as Record<string, unknown>[])
    : [];
  const elLaw = (el: Record<string, unknown>): string => {
    for (const k of cfg.lawSubKeys) {
      const v = el[k];
      if (typeof v === "string" && v.trim()) return canonLaw(v);
    }
    return "";
  };
  // Restrict to elements of the chosen law (when a law is selected).
  const scoped = sel.law
    ? elements.filter((el) => elLaw(el) === sel.law)
    : elements;
  if (sel.law && scoped.length === 0) return false;
  const wanted = (sel.sections || []).filter(Boolean);
  if (wanted.length === 0) return true; // law-only filter
  const present = new Set(
    scoped
      .map((el) => el[cfg.sectionSubKey])
      .filter((v): v is string => typeof v === "string" && v.trim() !== ""),
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
    } else if (f.control === "boolean") {
      const s = String(v).trim();
      if (s === "true") clauses.push({ field: f.key, op: "eq", value: true });
      else if (s === "false")
        clauses.push({ field: f.key, op: "eq", value: false });
    } else if (f.control === "number") {
      const r = (typeof v === "object" ? v : {}) as { min?: number; max?: number };
      if (r.min != null) clauses.push({ field: f.key, op: "ge", value: r.min });
      if (r.max != null) clauses.push({ field: f.key, op: "le", value: r.max });
    } else if (f.control === "date") {
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
    if (ff.control !== "select") continue;
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
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "defamation";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const scope = SCOPE_MAP[category];
    if (!scope) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }

    const config = await readPageConfig(scope.pageSlug);
    const scopeId = config.scope > 0 ? config.scope : scope.id;
    const size = config.pageSize;

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

    // ── Sort ──
    // Honour a user-chosen sort field (validated against the configured list).
    // Otherwise send nothing and rely on TAG-IT's default newest-first order.
    const reqSort = searchParams.get("sort") || "";
    const reqDir: SortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
    let sortKey = "";
    if (reqSort && config.sortFields.some((s) => s.key === reqSort)) {
      sortKey = (reqDir === "asc" ? "" : "-") + reqSort;
    }

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
      const schemaFieldsLs = config.filterFields.some((f) => f.control === "select")
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
          lawSectionFilter: lawSectionResponse,
        },
        { headers: { "Cache-Control": "private, no-store", "X-Cache": "BULK" } },
      );
    }

    // ── Fetch ONE page (with a small TTL cache) ──
    const cacheKey = `s${scopeId}|sz${size}|p${page}|${createHash("sha1")
      .update(filterJson + "|" + sortKey)
      .digest("hex")
      .slice(0, 16)}`;
    let entry = pageCacheGet(cacheKey);
    let cacheStatus = entry ? "HIT" : "MISS";
    if (!entry) {
      try {
        const res = await fetchUpstreamRulingsPage({
          scopeId,
          page,
          size,
          filterJson: filterJson || undefined,
          sortKey: sortKey || undefined,
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
    const schemaFields = config.filterFields.some((f) => f.control === "select")
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
        lawSectionFilter: lawSectionResponse,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
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
