import { NextRequest, NextResponse } from "next/server";

const TAGIT_API = process.env.TAGIT_API_URL || "https://tag-it.biz";
const TAGIT_USER = process.env.TAGIT_USERNAME || "";
const TAGIT_PASS = process.env.TAGIT_PASSWORD || "";

/* ── Scope IDs for each category ── */
const SCOPE_MAP: Record<string, number> = {
  "defamation": 4,     // לשון הרע
  "foi": 1,            // חופש מידע - uses text search within scope 1
};

/* ── Token cache ── */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${TAGIT_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: TAGIT_USER, password: TAGIT_PASS }),
  });

  if (!res.ok) throw new Error("Failed to authenticate with Tag-It API");

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 25 * 60 * 1000, // 25 min (token lasts 30)
  };
  return cachedToken.token;
}

/* ── Fetch rulings from Tag-It ── */
async function fetchRulings(scopeId: number, limit: number, textQuery?: string) {
  const token = await getToken();

  const body: Record<string, unknown> = {
    filters: [],
    sort: "newest",
    page: 1,
    size: limit,
    scope_id: scopeId,
  };

  if (textQuery) {
    body.text_query = textQuery;
  }

  const res = await fetch(`${TAGIT_API}/search/parametric`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Tag-It API error: ${res.status}`);

  const data = await res.json();
  const docs = data.documents || [];

  // Fetch metadata for each document
  const rulings = await Promise.all(
    docs.map(async (doc: Record<string, unknown>) => {
      try {
        const metaRes = await fetch(`${TAGIT_API}/documents/${doc.id}/metadata`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meta = await metaRes.json();
        const ai = (meta.ai_analysis || {}) as Record<string, unknown>;

        return {
          id: doc.id,
          caseName: ai["שם_התיק"] || doc.filename || "ללא שם",
          court: ai["בית_משפט"] || "",
          judges: ai["שופטים"] || [],
          date: ai["תאריך_המסמך"] || "",
          summary: ai["תקציר"] || "",
          title: ai["כותרת_המסמך"] || "",
          documentUrl: `${TAGIT_API}/documents/${doc.id}/view`,
        };
      } catch {
        return {
          id: doc.id,
          caseName: (doc.filename as string) || "ללא שם",
          court: "",
          judges: [],
          date: "",
          summary: "",
          title: "",
          documentUrl: `${TAGIT_API}/documents/${doc.id}/view`,
        };
      }
    }),
  );

  return { total: data.total || 0, rulings };
}

/* ── GET /api/rulings?category=defamation|foi&limit=5 ── */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "defamation";
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "5", 10)));

    const scopeId = SCOPE_MAP[category];
    if (!scopeId) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }

    // For FOI, search within the general scope using text
    const textQuery = category === "foi" ? "חופש מידע" : undefined;

    const data = await fetchRulings(scopeId, limit, textQuery);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    console.error("Rulings API error:", err);
    return NextResponse.json({ error: "שגיאה בטעינת פסיקה" }, { status: 500 });
  }
}
