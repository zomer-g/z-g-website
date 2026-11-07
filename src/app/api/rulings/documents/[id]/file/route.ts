import { NextRequest, NextResponse } from "next/server";
import { upstreamFileResponse } from "@/lib/upstream-file";

const UPSTREAM_BASE = process.env.TAGIT_API_URL || "https://tag-it.biz";

function getApiKey() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

/**
 * Proxy a rulings PDF through our server so public visitors can view it
 * without TAG-IT session auth. Mirrors the class-actions file proxy pattern:
 * server attaches the X-API-Key, streams the upstream response back, and
 * forces inline Content-Disposition for real PDFs (see src/lib/upstream-file.ts).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const url = `${UPSTREAM_BASE}/api/public/rulings/documents/${id}/file`;
    const upstream = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      // The upstream error body stays in our logs, not in a public response.
      const detail = await upstream.text().catch(() => "");
      console.error(`Rulings PDF proxy: upstream ${upstream.status} for ${id}:`, detail.slice(0, 200));
      return NextResponse.json(
        { error: "PDF unavailable", upstreamStatus: upstream.status },
        { status: upstream.status === 401 ? 502 : upstream.status },
      );
    }

    return await upstreamFileResponse(upstream);
  } catch (err) {
    console.error("Rulings PDF proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
