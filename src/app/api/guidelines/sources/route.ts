import { NextResponse } from "next/server";
import type { Guideline, UpstreamGuidelinesListResponse } from "@/types/guideline";
import { getCached, setCached, findUnfilteredKey } from "@/lib/guidelines-cache";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";
const UPSTREAM_LIMIT = 500;

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

function getApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

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
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  // Try to reuse the unfiltered cached fetch if present.
  const unfilteredKey = findUnfilteredKey();
  let items: Guideline[] | null = unfilteredKey ? getCached(unfilteredKey) : null;

  if (!items) {
    try {
      const qs = new URLSearchParams({
        limit: String(UPSTREAM_LIMIT),
        skip: "0",
      }).toString();
      const [upstream, ttlMs] = await Promise.all([
        fetch(`${UPSTREAM}?${qs}`, {
          headers: { "X-API-Key": apiKey, Accept: "application/json" },
          cache: "no-store",
        }),
        readTtlMs(),
      ]);

      if (!upstream.ok) {
        return NextResponse.json(
          { error: "Upstream error" },
          { status: upstream.status === 401 ? 502 : upstream.status }
        );
      }

      const json = (await upstream.json()) as UpstreamGuidelinesListResponse;
      const cleaned: Guideline[] = (json.items || []).map((it) => {
        const rest = { ...(it as unknown as Record<string, unknown>) };
        delete rest.file_url;
        delete rest.text_url;
        delete rest.csv_row;
        return rest as unknown as Guideline;
      });
      setCached(qs, cleaned, ttlMs);
      items = cleaned;
    } catch (err) {
      console.error("guidelines sources error:", err);
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }
  }

  const sources = Array.from(
    new Set(items.map((it) => it.source_label).filter((s): s is string => !!s && s.trim() !== "")),
  ).sort((a, b) => a.localeCompare(b, "he"));

  return NextResponse.json(
    { sources },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
