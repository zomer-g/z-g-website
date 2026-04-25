import { NextRequest, NextResponse } from "next/server";
import type { ClassActionListResponse } from "@/types/class-action";

const UPSTREAM = "https://tag-it.biz/api/public/class-action/documents";

const cache = new Map<string, { data: ClassActionListResponse; ts: number }>();
const CACHE_TTL = 3600_000;

const ALLOWED_PARAMS = ["skip", "limit", "date_from", "date_to", "court", "is_appeal"] as const;

function buildQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of ALLOWED_PARAMS) {
    const v = params.get(k);
    if (v != null && v !== "") out.set(k, v);
  }
  return out.toString();
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.CLASS_ACTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const qs = buildQuery(req.nextUrl.searchParams);
  const cacheKey = qs;
  const entry = cache.get(cacheKey);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return NextResponse.json(entry.data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const upstream = await fetch(`${UPSTREAM}${qs ? `?${qs}` : ""}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });

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

    cache.set(cacheKey, { data: cleaned, ts: Date.now() });
    if (cache.size > 200) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

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
