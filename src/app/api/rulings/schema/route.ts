import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPageContent } from "@/lib/content";
import type {
  FoiCostsPageContent,
  FoiJudgmentsPageContent,
  FoiRulingsPageContent,
  DefamationRulingsPageContent,
} from "@/types/content";

const UPSTREAM_BASE = process.env.TAGIT_API_URL || "https://tag-it.biz";

function getApiKey() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

// category → { built-in default scope, content slug } so we can honour the
// admin's configured scope override (content.query.scope) when set.
const CATEGORY_MAP: Record<string, { scope: number; slug: string }> = {
  defamation: { scope: 4, slug: "defamation-rulings" },
  foi: { scope: 6, slug: "foi-rulings" },
  "foi-judgments": { scope: 6, slug: "foi-judgments" },
  "foi-costs": { scope: 6, slug: "foi-costs" },
  "drug-sentencing": { scope: 1, slug: "drug-sentencing" },
};

type RulingsContent =
  | FoiCostsPageContent
  | FoiJudgmentsPageContent
  | FoiRulingsPageContent
  | DefamationRulingsPageContent;

async function configuredScope(slug: string): Promise<number> {
  try {
    const content = await getPageContent<RulingsContent>(slug);
    const s = Number(content?.query?.scope);
    return Number.isInteger(s) && s > 0 ? s : 0;
  } catch {
    return 0;
  }
}

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

  // Resolution order: explicit ?scope= (lets the editor preview an unsaved
  // scope change) → admin's saved scope for the page → built-in category
  // default.
  let scopeId = NaN;
  if (scopeParam && scopeParam.trim() !== "") {
    scopeId = Number(scopeParam);
  } else if (category && CATEGORY_MAP[category]) {
    const { scope, slug } = CATEGORY_MAP[category];
    scopeId = (await configuredScope(slug)) || scope;
  }

  if (!Number.isInteger(scopeId) || scopeId <= 0) {
    return NextResponse.json(
      { error: "scope לא תקין — נדרש מספר חיובי או category מוכר" },
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
