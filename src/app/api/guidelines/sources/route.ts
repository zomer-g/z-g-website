import { NextResponse } from "next/server";
import type { Guideline } from "@/types/guideline";
import {
  getCached,
  setCached,
  findUnfilteredKey,
  UNFILTERED_KEY,
} from "@/lib/guidelines-cache";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";
import {
  fetchAllUpstreamGuidelines,
  getGuidelinesApiKey,
  stripUrls,
} from "@/lib/guidelines-upstream";

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

async function readTtlMs(): Promise<number> {
  try {
    const content = await getPageContent<GuidelinesPageContent>("guidelines");
    const raw = Number(content?.cacheTtlMinutes);
    if (!Number.isFinite(raw)) return DEFAULT_TTL_MINUTES * 60_000;
    const clamped = Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, raw));
    return clamped * 60_000;
  } catch {
    return DEFAULT_TTL_MINUTES * 60_000;
  }
}

export async function GET() {
  const apiKey = getGuidelinesApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  // Reuse the unfiltered cache populated by /documents if present.
  const unfilteredKey = findUnfilteredKey();
  let items: Guideline[] | null = unfilteredKey ? getCached(unfilteredKey) : null;

  if (!items) {
    try {
      const [rawItems, ttlMs] = await Promise.all([
        fetchAllUpstreamGuidelines(),
        readTtlMs(),
      ]);
      if (rawItems === null) {
        return NextResponse.json(
          { error: "Upstream fetch failed" },
          { status: 502 },
        );
      }
      const cleaned = stripUrls(rawItems);
      setCached(UNFILTERED_KEY, cleaned, ttlMs);
      items = cleaned;
    } catch (err) {
      console.error("guidelines sources error:", err);
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }
  }

  const sources = Array.from(
    new Set(
      items
        .map((it) => it.source_label)
        .filter((s): s is string => !!s && s.trim() !== ""),
    ),
  ).sort((a, b) => a.localeCompare(b, "he"));

  return NextResponse.json(
    { sources },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
