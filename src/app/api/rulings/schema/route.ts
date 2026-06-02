import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const UPSTREAM_BASE = process.env.TAGIT_API_URL || "https://tag-it.biz";

function getApiKey() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

const SCOPE_MAP: Record<string, number> = {
  defamation: 4,
  foi: 6,
};

/**
 * Admin-only proxy to TAG-IT's schema-discovery endpoint. Returns the list
 * of fields available per scope (meta.*, ai.*, sql.*) — used by the admin
 * UI to author filter expressions and pick displayFields.
 *
 * GET /api/rulings/schema?category=foi|defamation
 *  or
 * GET /api/rulings/schema?scope=4|6
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "RULINGS_API_KEY (or CLASS_ACTION_API_KEY) not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const scopeParam = searchParams.get("scope");
  const scopeId =
    (category && SCOPE_MAP[category]) ||
    (scopeParam ? Number(scopeParam) : NaN);

  if (!Number.isInteger(scopeId) || (scopeId !== 4 && scopeId !== 6)) {
    return NextResponse.json(
      { error: "scope לא תקין — חייב להיות 4 (לשון הרע) או 6 (חופש מידע)" },
      { status: 400 },
    );
  }

  try {
    const url = `${UPSTREAM_BASE}/api/public/rulings/schema?scope=${scopeId}`;
    const res = await fetch(url, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") || "application/json",
        // Short-cache for admin viewing — the schema rarely changes.
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Rulings schema proxy error:", detail);
    return NextResponse.json(
      { error: "Upstream fetch failed", detail },
      { status: 502 },
    );
  }
}
