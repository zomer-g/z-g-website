import { NextRequest, NextResponse } from "next/server";
import { upstreamFileResponse } from "@/lib/upstream-file";

const UPSTREAM = "https://tag-it.biz/api/public/class-action/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.CLASS_ACTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${UPSTREAM}/${id}/file`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "PDF unavailable" },
        { status: upstream.status === 401 ? 502 : upstream.status }
      );
    }

    return await upstreamFileResponse(upstream);
  } catch (err) {
    console.error("class-actions PDF proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
