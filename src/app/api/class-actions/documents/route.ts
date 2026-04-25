import { NextRequest, NextResponse } from "next/server";
import type { ClassActionListResponse } from "@/types/class-action";
import { getCached, setCached } from "@/lib/class-actions-cache";
import { getPageContent } from "@/lib/content";
import type { ClassActionsPageContent } from "@/types/content";

const UPSTREAM = "https://tag-it.biz/api/public/class-action/documents";

const ALLOWED_PARAMS = ["skip", "limit", "date_from", "date_to", "court", "is_appeal"] as const;

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

function buildQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of ALLOWED_PARAMS) {
    const v = params.get(k);
    if (v != null && v !== "") out.set(k, v);
  }
  return out.toString();
}

async function readTtlMs(): Promise<number> {
  try {
    const content = await getPageContent<ClassActionsPageContent>("class-actions");
    const raw = Number(content?.cacheTtlMinutes);
    if (!Number.isFinite(raw)) return DEFAULT_TTL_MINUTES * 60_000;
    const clamped = Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, raw));
    return clamped * 60_000;
  } catch {
    return DEFAULT_TTL_MINUTES * 60_000;
  }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.CLASS_ACTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const qs = buildQuery(req.nextUrl.searchParams);
  const cacheKey = qs;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const [upstream, ttlMs] = await Promise.all([
      fetch(`${UPSTREAM}${qs ? `?${qs}` : ""}`, {
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

    const json = (await upstream.json()) as ClassActionListResponse;

    const cleaned: ClassActionListResponse = {
      total: Number(json.total) || 0,
      skip: Number(json.skip) || 0,
      limit: Number(json.limit) || 0,
      items: (json.items || []).map((it) => {
        const rest = { ...(it as unknown as Record<string, unknown>) };
        delete rest.file_url;
        return rest as unknown as ClassActionListResponse["items"][number];
      }),
    };

    setCached(cacheKey, cleaned, ttlMs);

    return NextResponse.json(cleaned, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("class-actions proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
