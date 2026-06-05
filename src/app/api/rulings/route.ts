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
import type { FilterExpression } from "@/types/ruling-filter";
import { evaluateFilter } from "@/lib/rulings-filter-eval";
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

function flattenFields(doc: UpstreamRulingItem): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const top = doc as Record<string, unknown>;
  // ai.* — supports both the legacy `ai_analysis` and the new `ai` grouping
  const ai = ((top.ai || top.ai_analysis) as Record<string, unknown>) || {};
  for (const k of Object.keys(ai)) out[`ai.${k}`] = ai[k];
  // sql.*
  const sql = (top.sql as Record<string, unknown>) || {};
  for (const k of Object.keys(sql)) out[`sql.${k}`] = sql[k];
  // meta.* — everything else top-level except the grouping keys
  const skip = new Set(["ai", "ai_analysis", "sql"]);
  for (const k of Object.keys(top)) {
    if (skip.has(k)) continue;
    out[`meta.${k}`] = top[k];
  }
  return out;
}

function normalize(doc: UpstreamRulingItem): NormalizedRuling {
  const top = doc as Record<string, unknown>;
  const ai = ((top.ai || top.ai_analysis) as Record<string, unknown>) || {};
  return {
    id: doc.id,
    caseName:
      pickString(ai["שם_התיק"], top.case_name, doc.filename) || "ללא שם",
    court: pickString(ai["בית_משפט"], top.court),
    judges: pickArray(ai["שופטים"], top.judges),
    date: pickString(ai["תאריך_המסמך"], top.date),
    summary: pickString(ai["תקציר"], top.summary),
    title: pickString(ai["כותרת_המסמך"], top.title),
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
}

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
    return {
      ttlMs: ttlMinutes * 60_000,
      allowedDocTypes: allowed,
      customQuery,
      displayFields,
    };
  } catch {
    return {
      ttlMs: DEFAULT_TTL_MINUTES * 60_000,
      allowedDocTypes: [],
      customQuery: null,
      displayFields: [],
    };
  }
}

function matchesAllowedType(
  item: UpstreamRulingItem,
  patterns: string[],
): boolean {
  if (patterns.length === 0) return true; // empty = allow everything
  const ai = (item.ai_analysis || {}) as Record<string, unknown>;
  const title = String(ai["כותרת_המסמך"] || "");
  if (!title) return false; // strict: no title = excluded when a filter is active
  return patterns.some((p) => title.includes(p));
}

function sortByDateDesc(items: UpstreamRulingItem[]): UpstreamRulingItem[] {
  return [...items].sort((a, b) => {
    const da = String(
      ((a.ai_analysis as Record<string, unknown>) || {})["תאריך_המסמך"] || "",
    );
    const db = String(
      ((b.ai_analysis as Record<string, unknown>) || {})["תאריך_המסמך"] || "",
    );
    return db.localeCompare(da);
  });
}

/* ── GET /api/rulings?category=defamation|foi&page=1&limit=12 ── */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "defamation";
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "12", 10)),
    );
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const scope = SCOPE_MAP[category];
    if (!scope) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }

    const config = await readPageConfig(scope.pageSlug);

    // Cache key includes a hash of the upstream filter so two pages with
    // different filters don't clobber each other. When customQuery is null
    // the filter param isn't sent and the cache key is just the scope.
    const filterJson = config.customQuery
      ? JSON.stringify(config.customQuery)
      : "";
    const filterHash = filterJson
      ? createHash("sha1").update(filterJson).digest("hex").slice(0, 12)
      : "";
    const cacheKey = filterHash
      ? `scope:${scope.id}:f:${filterHash}`
      : `scope:${scope.id}`;

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
          scopeId: scope.id,
          filterJson: filterJson || undefined,
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

    // Apply both filters in memory. allowedDocTypes is the simple chip UX;
    // customQuery is the structured FilterExpression that TAG-IT already
    // applied server-side. We still run evaluateFilter as a safety net in
    // case the upstream version diverges, and to keep the in-memory path
    // working if TAG-IT ever returns the legacy shape.
    const filtered = all
      .filter((it) => matchesAllowedType(it, config.allowedDocTypes))
      .filter((it) => evaluateFilter(it, config.customQuery));
    const sorted = sortByDateDesc(filtered);

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
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600",
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
