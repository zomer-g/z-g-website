// /api/whatsapp/media/[mediaId]
//
// Streams a single media file (image / audio / pdf / docx) from the
// WhatsappMedia table. This is the only endpoint that touches the
// actual Bytes column. Every other read intentionally omits `data`
// from its select to keep payloads small.
//
// Access path: media → chat → workspace → access check. Implemented
// inside requireMediaAccess so the same logic is shared with any future
// route that streams attached files.
//
// Response headers:
//   - Content-Type: detected MIME from upload time (default
//     application/octet-stream for unknown extensions).
//   - Content-Disposition: inline so the browser previews images/PDFs.
//     The filename is RFC-5987 percent-encoded so Hebrew filenames
//     don't break the header.
//   - Cache-Control: private, no-store — never share this across users
//     or proxies. The auth check is per-request.

import { NextRequest, NextResponse } from "next/server";
import { requireMediaAccess } from "@/lib/whatsapp-auth";

export const dynamic = "force-dynamic";

function contentDisposition(filename: string): string {
  // ASCII-safe fallback for the legacy `filename=` param + a UTF-8
  // version for modern clients (RFC 5987).
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await ctx.params;
  const gate = await requireMediaAccess(mediaId);
  if ("response" in gate) return gate.response;
  const { media } = gate;

  // Stream the buffer. For our sizes (single attachments well under
  // 50MB), a Uint8Array body is plenty efficient and avoids the
  // ReadableStream ergonomics.
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
