import { NextRequest, NextResponse } from "next/server";

const TAGIT_API = process.env.TAGIT_API_URL || "https://tag-it.biz";

/* ── Scope IDs for each category ── */
const SCOPE_MAP: Record<string, number> = {
  defamation: 4, // לשון הרע
  foi: 6,        // חופש מידע
};

function getApiKey() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

interface UpstreamItem {
  id: number;
  filename?: string;
  ai_analysis?: Record<string, unknown>;
  [key: string]: unknown;
}

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

function normalize(doc: UpstreamItem): NormalizedRuling {
  const ai = (doc.ai_analysis || {}) as Record<string, unknown>;
  // Accept either Hebrew AI-keys (current TAG-IT output) or flattened
  // English keys, so the route works with either response shape.
  return {
    id: doc.id,
    caseName: pickString(
      ai["שם_התיק"],
      (doc as Record<string, unknown>).case_name,
      doc.filename,
    ) || "ללא שם",
    court: pickString(ai["בית_משפט"], (doc as Record<string, unknown>).court),
    judges: pickArray(ai["שופטים"], (doc as Record<string, unknown>).judges),
    date: pickString(ai["תאריך_המסמך"], (doc as Record<string, unknown>).date),
    summary: pickString(ai["תקציר"], (doc as Record<string, unknown>).summary),
    title: pickString(ai["כותרת_המסמך"], (doc as Record<string, unknown>).title),
    documentUrl: `${TAGIT_API}/documents/${doc.id}/view`,
  };
}

async function fetchRulings(scopeId: number, page: number, size: number) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "RULINGS_API_KEY (or CLASS_ACTION_API_KEY) not configured in environment",
    );
  }

  const url = new URL(`${TAGIT_API}/api/public/rulings/documents`);
  url.searchParams.set("scope", String(scopeId));
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `TAG-IT rulings API failed: HTTP ${res.status} ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    total?: number;
    items?: UpstreamItem[];
    documents?: UpstreamItem[];
  };
  const items = data.items || data.documents || [];
  return { total: Number(data.total) || items.length, rulings: items.map(normalize) };
}

/* ── GET /api/rulings?category=defamation|foi&page=1&limit=20 ── */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "defamation";
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const scopeId = SCOPE_MAP[category];
    if (!scopeId) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }

    const data = await fetchRulings(scopeId, page, limit);

    return NextResponse.json(
      { ...data, page, size: limit },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
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
