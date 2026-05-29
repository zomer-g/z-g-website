// Splits a parsed FOI Guide chapter into ~1500-char chunks along paragraph
// boundaries, mirroring src/lib/guidelines-chunker.ts. Each chunk gets a short
// header (chapter title + slug) prepended for the embedding input, so the
// semantic search still has chapter context when matching mid-body chunks.

import type { ParsedChapter } from "./foi-guide-crawler";

const TARGET_CHARS = 1500;
const MAX_CHARS = 2200;
const MIN_CHARS = 200;
const OVERLAP_CHARS = 200;

export interface BuiltFoiChunk {
  index: number;
  text: string;
  embeddingInput: string;
  section: "header" | "body" | "case-law";
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function splitOnSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?;׃׀])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function isMostlyJunk(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 80) return false;
  let real = 0;
  for (const ch of trimmed) {
    if (/[\p{L}\p{N}]/u.test(ch)) real++;
  }
  return real / trimmed.length < 0.5;
}

function splitOversizedBlock(block: string): string[] {
  if (block.length <= MAX_CHARS) return [block];
  const sentences = splitOnSentences(block);
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length + 1 > MAX_CHARS && current.length >= MIN_CHARS) {
      out.push(current);
      current = current.slice(-OVERLAP_CHARS) + " " + s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) out.push(current);

  return out.flatMap((c) => {
    if (c.length <= MAX_CHARS) return [c];
    const slices: string[] = [];
    for (let i = 0; i < c.length; i += MAX_CHARS - OVERLAP_CHARS) {
      slices.push(c.slice(i, i + MAX_CHARS));
    }
    return slices;
  });
}

// The "דוגמאות שהוכרעו בבתי-המשפט" heading marks the start of the case-law
// section. Everything from that heading until the next H2-equivalent (we use
// the next "תקציר" / "סיכום" heading or chapter end) is tagged section="case-law"
// so the MCP can prioritise these chunks when returning court-decision context.
const CASE_LAW_HEADING_PATTERNS = [
  /דוגמאות שהוכרעו בבתי[- ]המשפט/,
  /דוגמאות מבתי[- ]המשפט/,
];
const CASE_LAW_END_PATTERNS = [/^תקציר/, /^סיכום/];

function splitBodyByCaseLawSection(
  paragraphs: string[],
): { body: string[]; caseLaw: string[] } {
  let startIdx = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    if (CASE_LAW_HEADING_PATTERNS.some((re) => re.test(paragraphs[i]))) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return { body: paragraphs, caseLaw: [] };

  let endIdx = paragraphs.length;
  for (let i = startIdx + 1; i < paragraphs.length; i++) {
    if (CASE_LAW_END_PATTERNS.some((re) => re.test(paragraphs[i]))) {
      endIdx = i;
      break;
    }
  }

  const body = [...paragraphs.slice(0, startIdx), ...paragraphs.slice(endIdx)];
  const caseLaw = paragraphs.slice(startIdx, endIdx);
  return { body, caseLaw };
}

function groupParagraphs(paragraphs: string[]): string[] {
  const grouped: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current.length + p.length + 2 > TARGET_CHARS && current.length >= MIN_CHARS) {
      grouped.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) grouped.push(current);
  return grouped;
}

export interface ChunkInput {
  title: string;
  slug: string;
  url: string;
  parsed: ParsedChapter;
}

export function chunkFoiChapter(input: ChunkInput): BuiltFoiChunk[] {
  const { title, url, parsed } = input;
  const chunks: BuiltFoiChunk[] = [];

  // Header chunk — always emit one. Holds title + URL + canonical chapter
  // marker so a search on just the chapter number / appendix letter hits.
  const headerText = [title, `מקור: ${url}`].filter(Boolean).join("\n\n");
  chunks.push({
    index: 0,
    text: headerText,
    embeddingInput: headerText,
    section: "header",
  });

  const body = parsed.bodyText.trim();
  if (!body) return chunks;

  const allParagraphs = splitParagraphs(body);
  const { body: bodyParas, caseLaw: caseLawParas } =
    splitBodyByCaseLawSection(allParagraphs);

  const embedHeader = title ? `${title}\n\n` : "";

  // Body chunks — grouped, oversized blocks expanded.
  const bodyGroups = groupParagraphs(bodyParas)
    .flatMap(splitOversizedBlock)
    .filter((c) => !isMostlyJunk(c));
  for (const text of bodyGroups) {
    chunks.push({
      index: chunks.length,
      text,
      embeddingInput: `${embedHeader}${text}`,
      section: "body",
    });
  }

  // Case-law chunks — same grouping, but tagged so the MCP can highlight or
  // boost them. A chapter without a "דוגמאות שהוכרעו" section just won't
  // produce any case-law chunks; the footnote-derived caseLawJson on the doc
  // still carries the citations regardless.
  const caseLawGroups = groupParagraphs(caseLawParas)
    .flatMap(splitOversizedBlock)
    .filter((c) => !isMostlyJunk(c));
  for (const text of caseLawGroups) {
    chunks.push({
      index: chunks.length,
      text,
      embeddingInput: `${embedHeader}${text}`,
      section: "case-law",
    });
  }

  return chunks;
}
