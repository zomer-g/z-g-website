/**
 * File types the write API accepts at PUT /api/v1/uploads/<name>.
 *
 * The type is read from the bytes (magic numbers), never from the extension
 * or a header, and must agree with the extension. SVG is deliberately absent:
 * it is XML that can carry script.
 */

export type UploadKind = "pdf" | "png" | "jpeg" | "webp";

export const UPLOAD_MIME: Record<UploadKind, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const UPLOAD_NAME_RE = /^api-[a-z0-9][a-z0-9._-]{0,100}\.(pdf|png|jpe?g|webp)$/;

/** The kind the filename promises, or null if the name is not acceptable. */
export function kindFromName(filename: string): UploadKind | null {
  const m = UPLOAD_NAME_RE.exec(filename);
  if (!m) return null;
  const ext = m[1];
  return ext === "jpg" || ext === "jpeg" ? "jpeg" : (ext as UploadKind);
}

const startsWith = (data: Uint8Array, sig: number[], at = 0) =>
  data.length >= at + sig.length && sig.every((b, i) => data[at + i] === b);

/** The kind the bytes actually are, or null if none we accept. */
export function sniffKind(data: Uint8Array): UploadKind | null {
  if (startsWith(data, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // "%PDF-"
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "jpeg";
  // "RIFF" <4-byte size> "WEBP"
  if (startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

/**
 * Checks a named upload. Returns the kind and its real MIME type, or the
 * reason it is refused.
 */
export function checkUpload(
  filename: string,
  data: Uint8Array,
): { ok: true; kind: UploadKind; mimeType: string } | { ok: false; status: 400 | 415; error: string } {
  const expected = kindFromName(filename);
  if (!expected) {
    return { ok: false, status: 400, error: "filename must be api-<lowercase latin, digits, . _ ->.(pdf|png|jpg|jpeg|webp)" };
  }
  const actual = sniffKind(data);
  if (!actual) return { ok: false, status: 415, error: "not a PDF, PNG, JPEG or WebP" };
  if (actual !== expected) {
    return { ok: false, status: 415, error: `content is ${actual}, but the name says ${expected}` };
  }
  return { ok: true, kind: actual, mimeType: UPLOAD_MIME[actual] };
}
