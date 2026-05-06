import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearCache, setCached, UNFILTERED_KEY } from "@/lib/guidelines-cache";
import { fetchAllUpstreamGuidelines, stripUrls } from "@/lib/guidelines-upstream";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";

const DEFAULT_TTL_MINUTES = 60;

async function readTtlMs(): Promise<number> {
  try {
    const content = await getPageContent<GuidelinesPageContent>("guidelines");
    const raw = Number(content?.cacheTtlMinutes);
    if (!Number.isFinite(raw)) return DEFAULT_TTL_MINUTES * 60_000;
    return Math.max(1, Math.min(1440, raw)) * 60_000;
  } catch {
    return DEFAULT_TTL_MINUTES * 60_000;
  }
}

// POST clears the in-memory cache and immediately re-fetches the full
// upstream list, so the next visitor (and the sources/counts panel) see
// fresh numbers without the lazy-fill latency. Optional ?source=<label>
// scopes the count we report back, but the actual fetch is unfiltered —
// upstream always returns the full corpus and we cache it once.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const sourceParam = req.nextUrl.searchParams.get("source")?.trim() || null;
  const cleared = clearCache();

  let imported = 0;
  let sourceCount: number | null = null;
  try {
    const items = await fetchAllUpstreamGuidelines();
    if (items === null) {
      return NextResponse.json(
        { cleared, error: "Upstream fetch failed" },
        { status: 502 },
      );
    }
    const cleaned = stripUrls(items);
    const ttlMs = await readTtlMs();
    setCached(UNFILTERED_KEY, cleaned, ttlMs);
    imported = cleaned.length;
    if (sourceParam) {
      sourceCount = cleaned.filter((it) => it.source_label === sourceParam).length;
    }
  } catch (err) {
    console.error("guidelines refresh error:", err);
    return NextResponse.json(
      { cleared, error: "Upstream fetch failed" },
      { status: 502 },
    );
  }

  const message = sourceParam
    ? `יובאו ${sourceCount ?? 0} מסמכים מ-"${sourceParam}" (סך הכל ${imported} במאגר).`
    : `יובאו ${imported} מסמכים מהמערכת המקורית.`;

  return NextResponse.json({
    cleared,
    imported,
    sourceCount,
    source: sourceParam,
    message,
  });
}
