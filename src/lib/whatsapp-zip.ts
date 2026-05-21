// Parses a WhatsApp "Export Chat" ZIP into rows we can write to the DB.
//
// Two export formats in the wild:
//
// 1. Android — "WhatsApp Chat with X.txt" + sibling media files.
//      DD/MM/YYYY, HH:mm - Sender Name: message body
//      DD/MM/YYYY, HH:mm - Sender Name: IMG-...jpg (file attached)
//      DD/MM/YYYY, HH:mm - Sender Name: <Media omitted>
//      DD/MM/YYYY, HH:mm - System notice (no colon)
//
// 2. iOS — "_chat.txt" + sibling media files. Brackets around the
//    timestamp, NBSP separators, "<filename> (file attached)" → "<filename>"
//    sometimes wrapped in attached: lines:
//      [DD/MM/YY, HH:mm:ss] Sender Name: message body
//      [DD/MM/YY, HH:mm:ss] Sender Name: ‎<attached: filename>
//
// Continuation lines (lines that don't start with a timestamp) are
// appended to the previous message's text.

import JSZip from "jszip";

export interface ParsedMedia {
  filename: string;
  mimeType: string;
  size: number;
  // Must be a Uint8Array whose underlying buffer is a concrete
  // ArrayBuffer (not ArrayBufferLike — which TS treats as potentially
  // SharedArrayBuffer and which Prisma's generated `Bytes` input type
  // rejects). The parser builds these via `Uint8Array.from(...)` so the
  // resulting buffer is always a fresh ArrayBuffer.
  data: Uint8Array<ArrayBuffer>;
}

export interface ParsedMessage {
  timestamp: Date;
  sender: string;        // "" for system notices
  isSystem: boolean;
  text: string | null;
  mediaFilename: string | null; // matches ParsedMedia.filename
}

export interface ParsedChat {
  contactName: string;
  messages: ParsedMessage[];
  media: ParsedMedia[];
}

// Extension → MIME map. Covers everything WhatsApp ships out by default
// (images, audio PTT, common docs). Unknown extensions fall through to
// application/octet-stream so the file is still served, just generically.
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  "3gp": "video/3gpp",
  opus: "audio/ogg",        // PTT voice notes — Android exports use .opus
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  vcf: "text/vcard",
  zip: "application/zip",
};

function mimeFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  const ext = filename.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

// Pull the contact name out of the chat .txt filename. WhatsApp exports
// localise the prefix, so we try every shape we've seen in the wild
// before giving up. "_chat.txt" carries no name and returns null.
//
//   English Android/iOS : "WhatsApp Chat with Talia.txt"          → "Talia"
//   Hebrew Android      : "צ׳אט WhatsApp עם דנה.txt"               → "דנה"
//   Hebrew alt          : "שיחת WhatsApp עם דנה.txt"               → "דנה"
function extractContactFromTxtName(txtFilename: string): string | null {
  const base = txtFilename.replace(/\.[^.]+$/, "");
  const en = /^WhatsApp Chat with\s+(.+)$/i.exec(base);
  if (en) return en[1].trim();
  // Hebrew uses the geresh (׳) in "צ׳אט" — accept the curly geresh,
  // ASCII apostrophe, and the right single-quote variant.
  const heChat = /^צ[׳'']?אט\s+WhatsApp\s+עם\s+(.+)$/i.exec(base);
  if (heChat) return heChat[1].trim();
  const heSicha = /^שיחת\s+WhatsApp\s+עם\s+(.+)$/i.exec(base);
  if (heSicha) return heSicha[1].trim();
  return null;
}

// Lines that start with one of these prefix shapes begin a new message.
const ANDROID_RE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[-–]\s*(.*)$/;
const IOS_RE =
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s+(.*)$/;

function parseDate(
  dd: string,
  mm: string,
  yyyy: string,
  hh: string,
  min: string,
  sec: string | undefined,
): Date {
  const day = Number(dd);
  const month = Number(mm) - 1;
  let year = Number(yyyy);
  if (year < 100) year += 2000;
  const hour = Number(hh);
  const minute = Number(min);
  const second = sec ? Number(sec) : 0;
  return new Date(year, month, day, hour, minute, second);
}

function stripBidiAndNbsp(s: string): string {
  // WhatsApp likes to insert LRM/RLM/LRE/RLE/PDF and NBSP/NNBSP around
  // bracketed timestamps, especially in iOS exports. Normalise so our
  // regexes match.
  return s
    .replace(/[​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[  ]/g, " ");
}

// Match attachment markers on a single line. The dotAll (`/s`) flag is
// intentionally NOT used — the project's tsconfig target predates ES2018
// regex flags, and we don't need `.` to cross newlines anyway: the parser
// splits the .txt on /\r?\n/ before applying these patterns.
const FILE_ATTACHED_RE = /^(.+?)\s*\(file attached\)\s*(.*)$/;          // Android
const IOS_ATTACHED_RE = /^<attached:\s*(.+?)>\s*(.*)$/;                 // iOS
const MEDIA_OMITTED = /^\s*<Media omitted>\s*$/i;

// Split the part after the timestamp into sender + body. WhatsApp uses the
// FIRST ": " as the separator. Anything without a colon is a system event.
function splitBody(after: string): { sender: string; body: string; isSystem: boolean } {
  const idx = after.indexOf(": ");
  if (idx < 0) return { sender: "", body: after.trim(), isSystem: true };
  return {
    sender: after.slice(0, idx).trim(),
    body: after.slice(idx + 2),
    isSystem: false,
  };
}

interface AttachmentInfo {
  filename: string | null;
  textRemainder: string | null;
}

function detectAttachment(body: string): AttachmentInfo {
  if (MEDIA_OMITTED.test(body)) {
    return { filename: null, textRemainder: body.trim() };
  }
  let m = FILE_ATTACHED_RE.exec(body);
  if (m) {
    const rest = m[2].trim();
    return { filename: m[1].trim(), textRemainder: rest || null };
  }
  m = IOS_ATTACHED_RE.exec(body);
  if (m) {
    const rest = m[2].trim();
    return { filename: m[1].trim(), textRemainder: rest || null };
  }
  return { filename: null, textRemainder: body };
}

export async function parseWhatsappZip(buffer: Buffer): Promise<ParsedChat> {
  const zip = await JSZip.loadAsync(buffer);

  // Locate the chat .txt. WhatsApp localises the filename ("WhatsApp Chat
  // with X.txt", "_chat.txt", "צ׳אט WhatsApp עם X.txt", and similar
  // per-locale variants) so we try the known prefixes first and then fall
  // back to picking any .txt file in the archive. Every legitimate
  // WhatsApp export contains exactly one .txt, so that fallback is safe.
  const txtCandidates = Object.values(zip.files).filter((f) => {
    if (f.dir) return false;
    const name = f.name.split(/[\\/]/).pop() ?? f.name;
    return /\.txt$/i.test(name);
  });
  const namedTxt = txtCandidates.find((f) => {
    const name = f.name.split(/[\\/]/).pop() ?? f.name;
    return (
      /^_chat\.txt$/i.test(name) ||
      /^WhatsApp Chat with .+\.txt$/i.test(name) ||
      /^צ[׳'']?אט\s+WhatsApp\s+עם\s.+\.txt$/i.test(name) ||
      /^שיחת\s+WhatsApp\s+עם\s.+\.txt$/i.test(name)
    );
  });
  // Prefer the localised name; otherwise take the largest .txt (a safer
  // tiebreaker than "first" for ZIPs that happen to bundle a stray note).
  const txtEntry =
    namedTxt ??
    (txtCandidates.length > 0
      ? txtCandidates.reduce((biggest, cur) => {
          // _data.uncompressedSize is the only size field JSZip exposes
          // for an in-memory entry; missing on directories (filtered out
          // above) — fall back to 0 so the reduce still works.
          const sizeOf = (f: JSZip.JSZipObject): number => {
            const internal = f as unknown as {
              _data?: { uncompressedSize?: number };
            };
            return internal._data?.uncompressedSize ?? 0;
          };
          return sizeOf(cur) > sizeOf(biggest) ? cur : biggest;
        })
      : null);
  if (!txtEntry) {
    throw new Error(
      "לא נמצא קובץ שיחה (.txt) בתוך ה-ZIP — האם זה אכן ייצוא של ווטסאפ?",
    );
  }

  const rawText = await txtEntry.async("string");
  // Strip a BOM if present, then split into lines preserving order.
  const text = rawText.replace(/^﻿/, "");
  const lines = stripBidiAndNbsp(text).split(/\r?\n/);

  const contactFromTxt = extractContactFromTxtName(
    (txtEntry.name.split(/[\\/]/).pop() ?? txtEntry.name).trim(),
  );

  // Collect media (everything that's not the chat .txt). Buffer the bytes
  // eagerly so the JSZip async iterator doesn't get tangled with the
  // sequential message loop below.
  const media: ParsedMedia[] = [];
  const mediaFilenames = new Set<string>();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (entry === txtEntry) continue;
    const filename = name.split(/[\\/]/).pop() ?? name;
    // JSZip's "uint8array" output is typed `Uint8Array` (which TS treats
    // as `Uint8Array<ArrayBufferLike>` — could be SharedArrayBuffer).
    // Prisma's Bytes input requires `Uint8Array<ArrayBuffer>`. The
    // `Uint8Array.from(iterable)` overload is specified to always
    // allocate a fresh ArrayBuffer, so its return type is the strict
    // `Uint8Array<ArrayBuffer>` we need. Pays one O(n) copy per file —
    // negligible at our sizes.
    const raw = await entry.async("uint8array");
    const data = Uint8Array.from(raw);
    media.push({
      filename,
      mimeType: mimeFor(filename),
      size: data.length,
      data,
    });
    mediaFilenames.add(filename);
  }

  // Parse the .txt line by line.
  const messages: ParsedMessage[] = [];
  for (const rawLine of lines) {
    const line = rawLine.replace(/^[‎‏]+/, "");
    if (!line.trim()) {
      // WhatsApp exports occasionally embed an empty line inside a
      // multi-line message. Append as a paragraph break to the previous
      // message rather than dropping it.
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        last.text = (last.text ?? "") + "\n";
      }
      continue;
    }

    const androidMatch = ANDROID_RE.exec(line);
    const iosMatch = !androidMatch ? IOS_RE.exec(line) : null;
    const match = androidMatch ?? iosMatch;

    if (!match) {
      // Continuation of the previous message.
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        last.text = (last.text ?? "") + "\n" + line;
      }
      continue;
    }

    const [, dd, mm, yyyy, hh, min, sec, after] = match;
    const timestamp = parseDate(dd, mm, yyyy, hh, min, sec);
    const { sender, body, isSystem } = splitBody(after);
    const { filename, textRemainder } = detectAttachment(body);

    // Only count the attachment if we actually have those bytes in the
    // ZIP — guards against typos in the .txt or partial exports.
    const haveBytes = !!filename && mediaFilenames.has(filename);

    messages.push({
      timestamp,
      sender,
      isSystem,
      text: textRemainder && textRemainder.length > 0 ? textRemainder : null,
      mediaFilename: haveBytes ? filename : null,
    });
  }

  // Fall back to the most common non-system sender if the .txt name didn't
  // carry the contact. Real-world Hebrew exports often produce
  // "צ׳אט וואטסאפ עם …" which we don't parse — but the first incoming
  // sender is always the other side of the conversation.
  let contactName = contactFromTxt ?? "";
  if (!contactName) {
    const senderCounts = new Map<string, number>();
    for (const m of messages) {
      if (!m.isSystem && m.sender) {
        senderCounts.set(m.sender, (senderCounts.get(m.sender) ?? 0) + 1);
      }
    }
    contactName =
      [...senderCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ללא שם";
  }

  return { contactName, messages, media };
}
