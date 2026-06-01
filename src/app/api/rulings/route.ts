import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllUpstreamRulings,
  type UpstreamRulingItem,
} from "@/lib/rulings-upstream";
import { getCached, setCached } from "@/lib/rulings-cache";
import { getPageContent } from "@/lib/content";
import type {
  DefamationRulingsPageContent,
  FoiRulingsPageContent,
} from "@/types/content";

const TAGIT_API = process.env.TAGIT_API_URL || "https://tag-it.biz";

const SCOPE_MAP: Record<string, { id: number; pageSlug: string }> = {
  defamation: { id: 4, pageSlug: "defamation-rulings" },
  foi:        { id: 6, pageSlug: "foi-rulings" },
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

function normalize(doc: UpstreamRulingItem): NormalizedRuling {
  const ai = (doc.ai_analysis || {}) as Record<string, unknown>;
  return {
    id: doc.id,
    caseName:
      pickString(
        ai["שם_התיק"],
        (doc as Record<string, unknown>).case_name,
        doc.filename,
      ) || "ללא שם",
    court: pickString(ai["בית_משפט"], (doc as Record<string, unknown>).court),
    judges: pickArray(ai["שופטים"], (doc as Record<string, unknown>).judges),
    date: pickString(ai["תאריך_המסמך"], (doc as Record<string, unknown>).date),
    summary: pickString(ai["תקציר"], (doc as Record<string, unknown>).summary),
    title: pickString(
      ai["כותרת_המסמך"],
      (doc as Record<string, unknown>).title,
    ),
    // Point at our proxy route, not the upstream /documents/{id}/view (that
     // endpoint requires session auth and would 401 for public visitors).
    documentUrl: `/api/rulings/documents/${doc.id}/file`,
  };
}

interface PageConfig {
  ttlMs: number;
  allowedDocTypes: string[];
}

async function readPageConfig(pageSlug: string): Promise<PageConfig> {
  try {
    const content =
      pageSlug === "foi-rulings"
        ? await getPageContent<FoiRulingsPageContent>("foi-rulings")
        : await getPageContent<DefamationRulingsPageContent>(
            "defamation-rulings",
          );
    const ttlRaw = Number(content?.cacheTtlMinutes);
    const ttlMinutes = Number.isFinite(ttlRaw)
      ? Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, ttlRaw))
      : DEFAULT_TTL_MINUTES;
    const allowed = Array.isArray(content?.allowedDocTypes)
      ? content.allowedDocTypes.map((s) => String(s).trim()).filter(Boolean)
      : [];
    return { ttlMs: ttlMinutes * 60_000, allowedDocTypes: allowed };
  } catch {
    return { ttlMs: DEFAULT_TTL_MINUTES * 60_000, allowedDocTypes: [] };
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

    // Cache the FULL upstream snapshot per scope. Filtering and pagination
    // happen in memory — so changing the admin's allowedDocTypes takes effect
    // immediately without re-fetching upstream.
    const cacheKey = `scope:${scope.id}`;
    let all = getCached(cacheKey);
    let cacheStatus = all ? "HIT" : "MISS";

    if (!all) {
      const fetched = await fetchAllUpstreamRulings({ scopeId: scope.id });
      if (fetched === null) {
        return NextResponse.json(
          {
            error: "שגיאה בטעינת פסיקה",
            detail: "Upstream fetch failed or RULINGS_API_KEY not configured",
          },
          { status: 502 },
        );
      }
      setCached(cacheKey, fetched, config.ttlMs);
      all = fetched;
      cacheStatus = "MISS";
    }

    const filtered = all.filter((it) =>
      matchesAllowedType(it, config.allowedDocTypes),
    );
    const sorted = sortByDateDesc(filtered);

    const total = sorted.length;
    const start = (page - 1) * limit;
    const pageSlice = sorted.slice(start, start + limit);
    const rulings = pageSlice.map(normalize);

    return NextResponse.json(
      { total, page, size: limit, rulings },
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
