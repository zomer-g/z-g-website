// /api/timeline/media/[mediaId] — gated streaming for timeline attachments.
// Mirrors /api/whatsapp/media/[mediaId]. See that file for the rationale
// on headers (private/no-store), RFC-5987 Content-Disposition, etc.

import { NextRequest, NextResponse } from "next/server";
import { requireTimelineMediaAccess } from "@/lib/timeline-auth";

export const dynamic = "force-dynamic";

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await ctx.params;
  const gate = await requireTimelineMediaAccess(mediaId);
  if ("response" in gate) return gate.response;
  const { media } = gate;

  return new NextResponse(new Uint8Array(media.data), {
    status: 200,
    headers: {
      "Content-Type": media.mimeType || "application/octet-stream",
      "Content-Length": String(media.size),
      "Content-Disposition": contentDisposition(media.filename),
      "Cache-Control": "private, no-store",
    },
  });
}
