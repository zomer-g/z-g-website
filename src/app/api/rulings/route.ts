import { NextRequest, NextResponse } from "next/server";

const TAGIT_API = process.env.TAGIT_API_URL || "https://tag-it.biz";
const TAGIT_USER = process.env.TAGIT_USERNAME || "";
const TAGIT_PASS = process.env.TAGIT_PASSWORD || "";

/* ── Scope IDs for each category ── */
const SCOPE_MAP: Record<string, number> = {
  "defamation": 4,     // לשון הרע
  "foi": 6,            // חופש מידע
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

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TAG-IT auth failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 25 * 60 * 1000, // 25 min (token lasts 30)
  };
  return cachedToken.token;
}

/* ── Fetch rulings from Tag-It ── */
async function fetchRulings(scopeId: number, page: number, size: number) {
  const token = await getToken();

  const body: Record<string, unknown> = {
    filters: [],
    sort: "newest",
    page,
    size,
    scope_id: scopeId,
  };

  const res = await fetch(`${TAGIT_API}/search/parametric`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TAG-IT parametric search failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const docs = (data.documents || []) as Array<Record<string, unknown>>;

  // Fetch metadata in batches to avoid overwhelming TAG-IT (and running into
  // serverless function timeouts when N is large). Each request also has its
  // own short timeout so a single slow doc doesn't block the whole page.
  const BATCH = 6;
  const META_TIMEOUT_MS = 5000;

  const fetchMeta = async (doc: Record<string, unknown>) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), META_TIMEOUT_MS);
    try {
      const metaRes = await fetch(`${TAGIT_API}/documents/${doc.id}/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
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
    } finally {
      clearTimeout(t);
    }
  };

  const rulings: Awaited<ReturnType<typeof fetchMeta>>[] = [];
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(fetchMeta));
    rulings.push(...results);
  }

  return { total: data.total || 0, rulings };
}

/* ── GET /api/rulings?category=defamation|foi&page=1&limit=20 ── */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "defamation";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const scopeId = SCOPE_MAP[category];
    if (!scopeId) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }

    const data = await fetchRulings(scopeId, page, limit);

    return NextResponse.json(
      { ...data, page, size: limit },
      {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
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
