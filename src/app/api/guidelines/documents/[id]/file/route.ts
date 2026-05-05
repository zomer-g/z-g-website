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

    const headers = new Headers();
    const ct = upstream.headers.get("content-type");
    const cd = upstream.headers.get("content-disposition");
    const cl = upstream.headers.get("content-length");
    if (ct) headers.set("Content-Type", ct);
    // Force `inline` disposition so the PDF renders inside an <iframe> on the
    // detail page (the upstream sometimes sends `attachment`, which makes
    // browsers download instead of render). The original filename — when the
    // upstream supplied one — is preserved so a manual "Save as" still uses it.
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
    console.error("guidelines PDF proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
