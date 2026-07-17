import { NextResponse } from "next/server";

/**
 * Size-capped JSON body reader for public endpoints.
 *
 * `await req.json()` buffers the entire body into memory before you get a
 * chance to look at it, so an unauthenticated caller can hand a 512MB box a
 * multi-hundred-MB body and OOM the web process. The cap has to be enforced
 * *while* reading, not after.
 *
 * Two layers:
 *   1. Content-Length — a cheap early reject, when the client declares a size.
 *      It is client-supplied and absent on chunked bodies, so it is a fast
 *      path, never the guarantee.
 *   2. A counting read of the stream that gives up the moment the cap is
 *      passed. This is the guarantee, and it holds whether Content-Length was
 *      missing, wrong, or a lie.
 */

// 64KB. The largest thing any public endpoint here legitimately accepts is a
// contact message or a comment; the field-level .max() limits sit well under
// this, so a body over the cap is a bug or an attack either way.
export const MAX_PUBLIC_BODY_BYTES = 64 * 1024;

function tooLarge(maxBytes: number) {
  return NextResponse.json(
    { error: `גוף הבקשה גדול מדי (מקסימום ${Math.floor(maxBytes / 1024)}KB).` },
    { status: 413 },
  );
}

type BodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function readJsonBody<T = unknown>(
  req: Request,
  maxBytes: number = MAX_PUBLIC_BODY_BYTES,
): Promise<BodyResult<T>> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, response: tooLarge(maxBytes) };
  }

  const body = req.body;
  let raw: string;

  if (!body) {
    // No stream to meter (some runtimes, and empty bodies). Content-Length was
    // already checked above; fall back to buffering.
    raw = await req.text();
    if (Buffer.byteLength(raw) > maxBytes) {
      return { ok: false, response: tooLarge(maxBytes) };
    }
  } else {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          // Stop pulling from the socket; we already know we're rejecting.
          await reader.cancel();
          return { ok: false, response: tooLarge(maxBytes) };
        }
        chunks.push(value);
      }
    } catch {
      return {
        ok: false,
        response: NextResponse.json({ error: "שגיאה בקריאת הבקשה" }, { status: 400 }),
      };
    }
    raw = Buffer.concat(chunks).toString("utf8");
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 }),
    };
  }
}
