// Timeline event importer — accepts multiple file shapes:
//
//   - text/csv                 → CSV table
//   - application/json         → JSON array
//   - .xlsx (any sheet)        → XLSX (first sheet)
//   - application/zip          → WhatsApp Chat Export → each message
//                                 becomes one event
//
// The CSV / JSON / XLSX paths share the same "table inference" pipeline:
//   1. Read the rows as plain { col: value } objects.
//   2. Sniff a date column (header-keyword OR ≥80% parseable cells).
//   3. Sniff the date format at the COLUMN level (DD/MM/YYYY vs
//      MM/DD/YYYY) based on which interpretation produces consistent
//      values. This handles tables that mix conventions.
//   4. Map other columns to actor/title/body/category via header
//      keywords with sensible fallbacks.
//
// The WhatsApp path delegates to the existing parseWhatsappZip — we
// just project ParsedMessage onto the event shape.

import JSZip from "jszip";
import * as XLSX from "xlsx";
import { parseWhatsappZip } from "@/lib/whatsapp-zip";

export interface ImportEvent {
  timestamp: Date;
  actor: string;
  category: string;
  title: string | null;
  body: string | null;
}

export interface ImportResult {
  events: ImportEvent[];
  warnings: string[];
}

const KNOWN_CATEGORIES = new Set([
  "action",
  "search",
  "message",
  "meeting",
  "note",
]);

// ── Date parsing ─────────────────────────────────────────────────── //

const ISO_RE =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:[Zz]|[+-]\d{2}:?\d{2})?)?$/;
// Three numeric parts separated by /, ., or -, optionally followed by
// HH:mm[:ss]. Year position is captured loosely; we disambiguate per
// column.
const TRIPLE_RE =
  /^(\d{1,4})[\/.\-](\d{1,4})[\/.\-](\d{1,4})(?:[T ,]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

function clamp4DigitYear(y: number): number {
  if (y >= 100) return y;
  return y < 50 ? 2000 + y : 1900 + y;
}

// Excel's serial dates: days since 1900-01-00 (with the leap-year bug).
// xlsx already converts via its `cellDates: true` option, but raw
// numbers can also leak through — handle them.
function excelSerialToDate(n: number): Date | null {
  if (!Number.isFinite(n) || n <= 0 || n > 2958465) return null;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parses a single value as a Date, given a column-level convention
 * for the order of the first two numbers ("dmy" or "mdy").
 *
 * Returns null if the value can't be parsed at all.
 */
export function parseDateCell(
  value: unknown,
  order: "dmy" | "mdy" = "dmy",
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    return excelSerialToDate(value);
  }
  const raw = String(value).trim().replace(/[‎‏‪-‮]/g, "");
  if (!raw) return null;

  // Try ISO 8601 first — unambiguous.
  const isoM = ISO_RE.exec(raw);
  if (isoM) {
    const [, y, mo, d, hh, mm, ss] = isoM;
    const dt = new Date(
      Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        hh ? Number(hh) : 0,
        mm ? Number(mm) : 0,
        ss ? Number(ss) : 0,
      ),
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Three-part with possible time suffix.
  const m = TRIPLE_RE.exec(raw);
  if (m) {
    const [, a, b, c, hh, mm, ss] = m;
    const na = Number(a);
    const nb = Number(b);
    const nc = Number(c);

    // YYYY-MM-DD shape (year leading) is unambiguous — the regex
    // matched but the ISO regex didn't (e.g. "2026/05/12" with slashes).
    if (na >= 1900 && na <= 2999) {
      const dt = new Date(
        Date.UTC(na, nb - 1, nc, hh ? Number(hh) : 0, mm ? Number(mm) : 0, ss ? Number(ss) : 0),
      );
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    // Year is trailing → first two parts are day/month or month/day.
    const day = order === "dmy" ? na : nb;
    const month = order === "dmy" ? nb : na;
    const year = clamp4DigitYear(nc);
    const dt = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hh ? Number(hh) : 0,
        mm ? Number(mm) : 0,
        ss ? Number(ss) : 0,
      ),
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Last-ditch: Date constructor (handles e.g. "12 May 2026" or RFC dates).
  const tryNative = new Date(raw);
  return Number.isNaN(tryNative.getTime()) ? null : tryNative;
}

/**
 * Infers the date-component ordering ("dmy" or "mdy") for a column.
 *
 * Logic: scan each value; if any has its first component > 12, the
 * column MUST be DMY; if any has its second component > 12, it MUST
 * be MDY. If neither is forced, default to DMY (Israeli/European
 * convention is the common case here).
 */
export function inferDateOrder(values: unknown[]): "dmy" | "mdy" {
  for (const v of values) {
    if (typeof v !== "string") continue;
    const raw = v.trim().replace(/[‎‏‪-‮]/g, "");
    const m = TRIPLE_RE.exec(raw);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    // Year-leading: irrelevant for order inference.
    if (a >= 1900 && a <= 2999) continue;
    if (a > 12 && a <= 31) return "dmy"; // first part is a day
    if (b > 12 && b <= 31) return "mdy"; // second part is a day
  }
  return "dmy";
}

// ── Table inference ──────────────────────────────────────────────── //

type Row = Record<string, unknown>;

const DATE_HEADERS = [
  "תאריך",
  "מועד",
  "date",
  "datetime",
  "timestamp",
  "when",
  "תאריך אירוע",
  "תאריך המסמך",
];
const ACTOR_HEADERS = [
  "actor",
  "שולח",
  "סופר",
  "מקור",
  "יחידה",
  "מאת",
  "שם יחידה",
  "from",
  "sender",
];
const TITLE_HEADERS = [
  "title",
  "כותרת",
  "הנדון",
  "סוג מסמך",
  "subject",
  "headline",
  "name",
];
const BODY_HEADERS = [
  "body",
  "text",
  "description",
  "תוכן",
  "גוף",
  "תיאור",
  "פירוט",
  "notes",
];
const CATEGORY_HEADERS = ["category", "type", "סוג", "קטגוריה"];

function lowerHeader(h: string): string {
  return h.trim().toLowerCase();
}

function findHeader(headers: string[], candidates: string[]): string | null {
  const lowered = headers.map(lowerHeader);
  for (const cand of candidates) {
    const c = cand.toLowerCase();
    const idx = lowered.findIndex(
      (h) => h === c || h.includes(c) || c.includes(h),
    );
    if (idx >= 0) return headers[idx];
  }
  return null;
}

// Sniff the date column when no header match. We look for the column
// whose values parse-as-date at ≥80% (under both orderings, taking the
// higher rate).
function sniffDateColumn(rows: Row[], headers: string[]): string | null {
  let best: { col: string; rate: number } | null = null;
  for (const col of headers) {
    const vals = rows.map((r) => r[col]);
    const nonEmpty = vals.filter((v) => v != null && String(v).trim() !== "");
    if (nonEmpty.length === 0) continue;
    const orderDmy = nonEmpty.filter((v) => parseDateCell(v, "dmy") != null).length;
    const orderMdy = nonEmpty.filter((v) => parseDateCell(v, "mdy") != null).length;
    const ok = Math.max(orderDmy, orderMdy);
    const rate = ok / nonEmpty.length;
    if (rate >= 0.8 && (!best || rate > best.rate)) {
      best = { col, rate };
    }
  }
  return best ? best.col : null;
}

interface ColumnMap {
  date: string;
  actor: string | null;
  title: string | null;
  body: string | null;
  category: string | null;
}

function buildColumnMap(rows: Row[], headers: string[]): ColumnMap | null {
  const dateCol = findHeader(headers, DATE_HEADERS) ?? sniffDateColumn(rows, headers);
  if (!dateCol) return null;
  const rest = headers.filter((h) => h !== dateCol);
  const actor = findHeader(rest, ACTOR_HEADERS);
  const title = findHeader(rest, TITLE_HEADERS);
  const body = findHeader(rest, BODY_HEADERS);
  const category = findHeader(rest, CATEGORY_HEADERS);
  return { date: dateCol, actor, title, body, category };
}

function rowsToEvents(rows: Row[]): ImportResult {
  const warnings: string[] = [];
  if (rows.length === 0) {
    return { events: [], warnings: ["הקובץ ריק"] };
  }
  const headers = Object.keys(rows[0]);
  const map = buildColumnMap(rows, headers);
  if (!map) {
    return {
      events: [],
      warnings: ["לא זוהתה עמודת תאריך — ודאי שיש בעמודה תאריכים תקינים."],
    };
  }

  const order = inferDateOrder(rows.map((r) => r[map.date]));

  // Collect "leftover" columns (everything we didn't explicitly map)
  // to fold into the body, so no information is dropped.
  const usedCols = new Set([map.date, map.actor, map.title, map.body, map.category].filter(Boolean) as string[]);
  const leftoverCols = headers.filter((h) => !usedCols.has(h));

  const events: ImportEvent[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const dt = parseDateCell(r[map.date], order);
    if (!dt) {
      warnings.push(`שורה ${i + 2}: תאריך לא תקין (${String(r[map.date] ?? "")})`);
      continue;
    }
    const actor = map.actor ? String(r[map.actor] ?? "").trim() : "";
    const title = map.title ? String(r[map.title] ?? "").trim() : "";
    let body = map.body ? String(r[map.body] ?? "").trim() : "";

    // Fold leftover columns into body as "Key: value" lines so they're
    // not lost on import. Keeps the body readable + searchable.
    const extras: string[] = [];
    for (const col of leftoverCols) {
      const v = r[col];
      if (v == null) continue;
      const s = String(v).trim();
      if (!s) continue;
      extras.push(`${col}: ${s}`);
    }
    if (extras.length > 0) {
      body = body ? `${body}\n${extras.join("\n")}` : extras.join("\n");
    }

    if (!title && !body) {
      warnings.push(`שורה ${i + 2}: ללא כותרת או גוף — מדלגת.`);
      continue;
    }

    let category = map.category
      ? String(r[map.category] ?? "").trim().toLowerCase()
      : "";
    if (!KNOWN_CATEGORIES.has(category)) category = "note";

    events.push({
      timestamp: dt,
      actor: actor || "—",
      category,
      title: title || null,
      body: body || null,
    });
  }
  return { events, warnings };
}

// ── Public entry points ──────────────────────────────────────────── //

export function parseCsv(text: string): ImportResult {
  const grid = parseCsvGrid(text);
  if (grid.length === 0) return { events: [], warnings: ["CSV ריק"] };
  const headers = grid[0].map((h) => h.trim());
  const rows: Row[] = grid
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const obj: Row = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i] ?? "";
      return obj;
    });
  return rowsToEvents(rows);
}

export function parseJsonArray(json: unknown): ImportResult {
  if (!Array.isArray(json)) {
    return { events: [], warnings: ["מצופה מערך של אובייקטים"] };
  }
  return rowsToEvents(json as Row[]);
}

export async function parseXlsxBuffer(buffer: Buffer): Promise<ImportResult> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { events: [], warnings: ["אין גיליונות בקובץ"] };
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
    defval: "",
    blankrows: false,
  });
  return rowsToEvents(rows);
}

export async function parseWhatsappZipForTimeline(
  buffer: Buffer,
): Promise<ImportResult> {
  // Heuristic — if the archive doesn't look like a WhatsApp export, the
  // existing parser throws and we surface that error to the caller.
  const parsed = await parseWhatsappZip(buffer);
  const events: ImportEvent[] = parsed.messages
    .filter((m) => !m.isSystem)
    .map((m) => ({
      timestamp: m.timestamp,
      actor: m.sender || "—",
      category: m.mediaFilename ? "message" : "message",
      title: null,
      body:
        m.text ??
        (m.mediaFilename ? `[צרופה: ${m.mediaFilename}]` : "(הודעה ריקה)"),
    }));
  const warnings: string[] = [];
  if (events.length === 0) {
    warnings.push("לא נמצאו הודעות בייצוא ה-ZIP");
  }
  return { events, warnings };
}

// Helper: detect whether a buffer is a ZIP that looks like a WhatsApp
// export (vs a generic XLSX which is also a ZIP under the hood).
// XLSX archives contain `xl/workbook.xml`; WhatsApp archives contain
// a `.txt` and never that path.
export async function isWhatsappZipShape(buffer: Buffer): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files);
    if (names.some((n) => n.toLowerCase().endsWith("xl/workbook.xml"))) {
      return false; // XLSX
    }
    return names.some((n) => /\.txt$/i.test(n));
  } catch {
    return false;
  }
}

// ── Local CSV grid parser (no dep) ───────────────────────────────── //

function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}
