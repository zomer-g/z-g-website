import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_BASE = process.env.TAGIT_API_URL || "https://tag-it.biz";

function getApiKey() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

/**
 * Proxy a rulings PDF through our server so public visitors can view it
 * without TAG-IT session auth. Mirrors the class-actions file proxy pattern:
 * server attaches the X-API-Key, streams the upstream response back, and
 * forces inline Content-Disposition so the PDF renders in the browser.
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
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: "PDF unavailable",
          upstreamStatus: upstream.status,
          detail: detail.slice(0, 200),
        },
        { status: upstream.status === 401 ? 502 : upstream.status },
      );
    }

    const headers = new Headers();
    const ct = upstream.headers.get("content-type");
    const cd = upstream.headers.get("content-disposition");
    const cl = upstream.headers.get("content-length");
    if (ct) headers.set("Content-Type", ct);
    // Force `inline` so browsers render the PDF rather than download it.
    if (cd) {
      const filenameMatch = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filenamePart = filenameMatch ? `; filename="${filenameMatch[1]}"` : "";
      headers.set("Content-Disposition", `inline${filenamePart}`);
    } else {
      headers.set("Content-Disposition", "inline");
    }
    if (cl) headers.set("Content-Length", cl);
    headers.set("Cache-Control", "private, no-store");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error("Rulings PDF proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
