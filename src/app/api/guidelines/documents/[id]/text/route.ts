import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";

function getApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const upstream = await fetch(`${UPSTREAM}/${id}/text`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Text unavailable" },
        { status: upstream.status === 401 ? 502 : upstream.status }
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || "text/plain; charset=utf-8",
    );
    headers.set("Cache-Control", "private, no-store");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error("guidelines text proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
