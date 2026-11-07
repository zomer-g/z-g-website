import { NextResponse } from "next/server";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/**
 * Serve a file proxied from TAG-IT (rulings, guidelines, class actions) from
 * the site's own origin.
 *
 * Only a real PDF (by its first bytes, whatever the upstream Content-Type
 * says) is served inline as application/pdf. Anything else goes out as an
 * opaque download under a sandbox CSP. Passing the upstream Content-Type
 * through meant an HTML or SVG document stored upstream would run as script
 * on www.z-g.co.il, with any signed-in admin's session.
 *
 * No CSP sandbox on the PDF itself: Chrome refuses to render a PDF under it,
 * which would break the inline viewer on the detail pages.
 */
export async function upstreamFileResponse(upstream: Response): Promise<NextResponse> {
  const body = upstream.body!;
  const reader = body.getReader();

  // Collect enough leading bytes to recognise a PDF, without buffering the file.
  const head: Uint8Array[] = [];
  let headLen = 0;
  let done = false;
  while (headLen < PDF_MAGIC.length) {
    const r = await reader.read();
    if (r.done) {
      done = true;
      break;
    }
    head.push(r.value);
    headLen += r.value.length;
  }
  const first = new Uint8Array(headLen);
  let off = 0;
  for (const c of head) {
    first.set(c, off);
    off += c.length;
  }
  const isPdf = PDF_MAGIC.every((b, i) => first[i] === b);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (first.length) controller.enqueue(first);
      if (done) controller.close();
    },
    async pull(controller) {
      const r = await reader.read();
      if (r.done) controller.close();
      else controller.enqueue(r.value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  const cd = upstream.headers.get("content-disposition");
  const m = cd?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  // The name goes back out inside a quoted header value: drop quotes,
  // backslashes and control characters rather than trusting the upstream.
  const name = m ? m[1].replace(/["\\\u0000-\u001f\u007f]/g, "").trim() : "";
  const filenamePart = name ? `; filename="${name}"` : "";

  const headers = new Headers();
  if (isPdf) {
    headers.set("Content-Type", "application/pdf");
    // Inline so the PDF renders in the detail page's <iframe> (upstream
    // sometimes sends `attachment`); the filename keeps "Save as" useful.
    headers.set("Content-Disposition", `inline${filenamePart}`);
    const cl = upstream.headers.get("content-length");
    if (cl) headers.set("Content-Length", cl);
  } else {
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", `attachment${filenamePart}`);
    headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(stream, { status: 200, headers });
}
