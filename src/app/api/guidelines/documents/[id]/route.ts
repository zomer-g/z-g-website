import { NextRequest, NextResponse } from "next/server";
import type { Guideline } from "@/types/guideline";
import { getGuidelinesApiKey } from "@/lib/guidelines-upstream";

// Returns a single guideline's metadata (no content_text — that's only
// available via this endpoint when explicitly requested via ?withContent=1
// since it can be 30K+ chars). The detail page uses this for the header /
// metadata rendering and embeds the PDF separately via the existing /file
// route in an iframe.

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";

interface UpstreamSingleDoc extends Guideline {
  content_text?: string | null;
  file_url?: string;
  text_url?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = getGuidelinesApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${UPSTREAM}/${id}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    if (upstream.status === 404) {
      return NextResponse.json({ error: "Guideline not found" }, { status: 404 });
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream fetch failed" },
        { status: 502 },
      );
    }

    const doc = (await upstream.json()) as UpstreamSingleDoc;

    // Strip the upstream-key-bearing URLs before responding — same policy as
    // the list endpoint (`stripUrls`).
    const { file_url, text_url, ...rest } = doc;
    void file_url;
    void text_url;

    // content_text can be huge (37K+ chars). Only include it when the caller
    // explicitly asks — the detail page doesn't render it (it embeds the PDF
    // via iframe instead).
    const includeContent = req.nextUrl.searchParams.get("withContent") === "1";
    if (!includeContent) {
      delete (rest as { content_text?: string | null }).content_text;
    }

    return NextResponse.json(rest, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("guideline single-doc proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
