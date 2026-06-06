import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllUpstreamRulings,
  UpstreamError,
  type UpstreamRulingItem,
} from "@/lib/rulings-upstream";
import { getCached, setCached } from "@/lib/rulings-cache";
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
} from "@/types/ruling-filter";
import { VALID_FILTER_CONTROLS } from "@/types/ruling-filter";
import { evaluateFilter, getFieldValue } from "@/lib/rulings-filter-eval";
import { createHash } from "crypto";

const TAGIT_API = process.env.TAGIT_API_URL || "https://tag-it.biz";

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
  scope: number; // 0 = use the per-category default
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

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
      scope: 0,
      pageSize: DEFAULT_PAGE_SIZE,
    };
  }
}

// Read the doc title/date from whichever shape TAG-IT returned:
//   new shape   → item.ai.כותרת_המסמך / item.meta.document_date
//   legacy shape → item.ai_analysis.כותרת_המסמך
function docTitle(item: UpstreamRulingItem): string {
  const ai = ((item.ai || item.ai_analysis) as Record<string, unknown>) || {};
  const meta = (item.meta as Record<string, unknown>) || {};
  return String(ai["כותרת_המסמך"] || meta.document_title || "");
}

function docDate(item: UpstreamRulingItem): string {
  const ai = ((item.ai || item.ai_analysis) as Record<string, unknown>) || {};
  const meta = (item.meta as Record<string, unknown>) || {};
  return String(ai["תאריך_המסמך"] || meta.document_date || "");
}

function matchesAllowedType(
  item: UpstreamRulingItem,
  patterns: string[],
): boolean {
  if (patterns.length === 0) return true; // empty = allow everything
  const title = docTitle(item);
  if (!title) return false; // strict: no title = excluded when a filter is active
  return patterns.some((p) => title.includes(p));
}

function sortByDateDesc(items: UpstreamRulingItem[]): UpstreamRulingItem[] {
  return [...items].sort((a, b) => docDate(b).localeCompare(docDate(a)));
}

// Collect every field key the page config references (display + filters +
// sort + the leaves of customQuery).
function collectLeafFields(expr: FilterExpression | null, out: Set<string>) {
  if (!expr) return;
  if ("op" in expr && (expr.op === "and" || expr.op === "or")) {
    for (const c of expr.clauses) collectLeafFields(c, out);
  } else if ("op" in expr && expr.op === "not") {
    collectLeafFields(expr.clause, out);
  } else if ("field" in expr) {
    out.add(expr.field);
  }
}

function referencedKeys(cfg: PageConfig): Set<string> {
  const keys = new Set<string>();
  cfg.displayFields.forEach((k) => keys.add(k));
  cfg.filterFields.forEach((f) => keys.add(f.key));
  cfg.sortFields.forEach((s) => keys.add(s.key));
  collectLeafFields(cfg.customQuery, keys);
  return keys;
}

// Base fields we always need for the card header/metadata when limiting the
// payload with `fields`.
const BASE_FIELDS = [
  "ai.שם_התיק",
  "ai.בית_משפט",
  "ai.שופטים",
  "ai.תקציר",
  "ai.כותרת_המסמך",
  "ai.תאריך_המסמך",
  "meta.document_date",
  "meta.court_name",
  "meta.case_name",
  "meta.document_title",
  "meta.filename",
];

// Expand a key into itself + its ancestor group prefixes, so requesting a
// nested leaf ("sql.a.b.c") also asks for the parent groups ("sql.a", "sql.a.b").
function withPrefixes(key: string): string[] {
  const parts = key.split(".");
  const out: string[] = [];
  for (let i = 2; i <= parts.length; i++) out.push(parts.slice(0, i).join("."));
  return out.length ? out : [key];
}

// Generic sort by any field key. Numeric when both values parse as numbers
// (so cost amounts order numerically), otherwise locale string compare (which
// also orders ISO YYYY-MM-DD dates chronologically). Empty values sink to the
// bottom regardless of direction.
function sortByField(
  items: UpstreamRulingItem[],
  key: string,
  dir: SortDir,
): UpstreamRulingItem[] {
  const sign = dir === "asc" ? 1 : -1;
  const numOf = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/[^\d.-]/g, "");
      if (cleaned) {
        const n = Number(cleaned);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  };
  const strOf = (v: unknown): string =>
    v == null ? "" : Array.isArray(v) ? v.join(" ") : String(v);

  return [...items].sort((a, b) => {
    const av = getFieldValue(a, key);
    const bv = getFieldValue(b, key);
    const aEmpty = av == null || av === "";
    const bEmpty = bv == null || bv === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1; // empties always last
    if (bEmpty) return -1;

    const an = numOf(av);
    const bn = numOf(bv);
    if (an != null && bn != null) return (an - bn) * sign;
    return strOf(av).localeCompare(strOf(bv), "he") * sign;
  });
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

function valueToString(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(valueToString).join(" ");
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return String(v);
}

function valueToNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // Strip currency/commas so "7,000 ש״ח" still compares numerically.
    const cleaned = v.replace(/[^\d.-]/g, "");
    if (cleaned) {
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function passesUserFilter(
  item: UpstreamRulingItem,
  field: RulingsFilterField,
  value: UserFilterValue,
): boolean {
  const actual = getFieldValue(item, field.key);

  switch (field.control) {
    case "text": {
      const needle = String(value ?? "").trim().toLocaleLowerCase("he-IL");
      if (!needle) return true;
      return valueToString(actual).toLocaleLowerCase("he-IL").includes(needle);
    }
    case "select": {
      const want = String(value ?? "").trim();
      if (!want) return true;
      return valueToString(actual) === want;
    }
    case "number": {
      const range = (value || {}) as { min?: number; max?: number };
      const n = valueToNumber(actual);
      if (range.min != null && (n == null || n < range.min)) return false;
      if (range.max != null && (n == null || n > range.max)) return false;
      return true;
    }
    case "date": {
      const range = (value || {}) as { from?: string; to?: string };
      const d = valueToString(actual).slice(0, 10); // YYYY-MM-DD
      if (range.from && (!d || d < range.from)) return false;
      if (range.to && (!d || d > range.to)) return false;
      return true;
    }
    default:
      return true;
  }
}

function applyUserFilters(
  items: UpstreamRulingItem[],
  filterFields: RulingsFilterField[],
  userFilters: Record<string, UserFilterValue>,
): UpstreamRulingItem[] {
  const active = filterFields.filter((f) => {
    const v = userFilters[f.key];
    if (v == null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (typeof v === "object") return Object.keys(v).length > 0;
    return false;
  });
  if (active.length === 0) return items;
  return items.filter((it) =>
    active.every((f) => passesUserFilter(it, f, userFilters[f.key])),
  );
}

// Distinct values present in the data for each "select" control, so the
// public page can render real dropdown options without a second request.
function computeSelectOptions(
  items: UpstreamRulingItem[],
  filterFields: RulingsFilterField[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of filterFields) {
    if (f.control !== "select") continue;
    const set = new Set<string>();
    for (const it of items) {
      const s = valueToString(getFieldValue(it, f.key)).trim();
      if (s) set.add(s);
    }
    out[f.key] = [...set].sort((a, b) => a.localeCompare(b, "he"));
  }
  return out;
}

/* ── GET /api/rulings?category=defamation|foi&page=1&limit=12 ── */

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

    // The admin controls the scope (config.scope) and the page size
    // (config.pageSize). Scope 0 = fall back to the per-category default.
    const scopeId = config.scope > 0 ? config.scope : scope.id;
    const limit = config.pageSize;

    // Cache key includes a hash of the upstream filter so two pages with
    // different filters don't clobber each other. When customQuery is null
    // the filter param isn't sent and the cache key is just the scope.
    const filterJson = config.customQuery
      ? JSON.stringify(config.customQuery)
      : "";

    // When the page references sql.*/meta.* fields but has no customQuery to
    // trigger TAG-IT's new (grouped) shape, request those fields explicitly —
    // that both forces the new shape and pulls the nested groups we need.
    const refKeys = referencedKeys(config);
    const needsNewShape = [...refKeys].some(
      (k) => k.startsWith("sql.") || k.startsWith("meta."),
    );
    let fieldsParam = "";
    if (!filterJson && needsNewShape) {
      const set = new Set<string>(BASE_FIELDS);
      for (const k of refKeys) withPrefixes(k).forEach((p) => set.add(p));
      fieldsParam = [...set].join(",");
    }

    const cacheSig = filterJson || (fieldsParam ? `fields:${fieldsParam}` : "");
    const filterHash = cacheSig
      ? createHash("sha1").update(cacheSig).digest("hex").slice(0, 12)
      : "";
    const cacheKey = filterHash
      ? `scope:${scopeId}:f:${filterHash}`
      : `scope:${scopeId}`;

    let all = getCached(cacheKey);
    let cacheStatus = all ? "HIT" : "MISS";

    if (!all) {
      try {
        // Only send `filter` when the admin actually configured one. We
        // used to always send `sort` to force TAG-IT's "new shape" (which
        // exposes sql.*/meta.*), but unknown sort keys 400 out the entire
        // page. Sorting is done in memory below either way — so when no
        // filter is set we fall back to TAG-IT's legacy shape and the
        // page still works. The new shape only matters for pages with
        // sql./meta. fields in customQuery or displayFields, and those
        // pages will have a filter set anyway, which auto-triggers the
        // new shape.
        const fetched = await fetchAllUpstreamRulings({
          scopeId,
          filterJson: filterJson || undefined,
          fieldsParam: fieldsParam || undefined,
        });
        if (fetched === null) {
          return NextResponse.json(
            {
              error: "שגיאה בטעינת פסיקה",
              detail:
                "RULINGS_API_KEY (or CLASS_ACTION_API_KEY) not configured",
            },
            { status: 502 },
          );
        }
        setCached(cacheKey, fetched, config.ttlMs);
        all = fetched;
        cacheStatus = "MISS";
      } catch (err) {
        if (err instanceof UpstreamError) {
          // Pass TAG-IT's flat error body through so the admin can see
          // {"error":"unknown_field","field":"ai.X"} directly.
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

    // Apply the admin's base filters in memory. allowedDocTypes is the simple
    // chip UX; customQuery is the structured FilterExpression that TAG-IT
    // already applied server-side (re-run as a safety net / legacy fallback).
    const base = all
      .filter((it) => matchesAllowedType(it, config.allowedDocTypes))
      .filter((it) => evaluateFilter(it, config.customQuery));

    // Dropdown options are computed from the admin-filtered set (not the
    // user-filtered one) so the choices stay stable as the user narrows down.
    const filterOptions = computeSelectOptions(base, config.filterFields);

    // Layer the user's interactive filter selections on top.
    const userFilters = parseUserFilters(searchParams.get("userFilters"));
    const filtered = applyUserFilters(base, config.filterFields, userFilters);

    // Sorting: when the admin configured sortFields, honour the user's
    // chosen field+direction (validated against the allowed list), defaulting
    // to the first configured field, descending. Otherwise fall back to the
    // built-in newest-first by document date.
    const reqSort = searchParams.get("sort") || "";
    const reqDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
    let sorted: UpstreamRulingItem[];
    if (config.sortFields.length > 0) {
      const allowedKeys = new Set(config.sortFields.map((s) => s.key));
      const sortKey = allowedKeys.has(reqSort)
        ? reqSort
        : config.sortFields[0].key;
      sorted = sortByField(filtered, sortKey, reqDir as SortDir);
    } else {
      sorted = sortByDateDesc(filtered);
    }

    const total = sorted.length;
    const start = (page - 1) * limit;
    const pageSlice = sorted.slice(start, start + limit);
    const rulings = pageSlice.map(normalize);

    return NextResponse.json(
      {
        total,
        page,
        size: limit,
        rulings,
        displayFields: config.displayFields,
        filterFields: config.filterFields,
        filterOptions,
        sortFields: config.sortFields,
      },
      {
        headers: {
          // User filters vary by query string; keep it private+short so a
          // shared edge cache doesn't serve one user's filtered view to
          // another.
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
