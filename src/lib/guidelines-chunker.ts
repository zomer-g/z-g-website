// Splits a guideline document into ~1500-char chunks along paragraph
// boundaries. Each chunk gets a short header (title + topic + chunk index)
// prepended so the embedding sees enough context to be useful in isolation.
//
// We split on paragraph boundaries (double newline) first; if a single
// paragraph exceeds the target size, fall back to splitting on single
// newlines, then on sentences (. ! ? ;).

const TARGET_CHARS = 1500;
const MAX_CHARS = 2200;
const MIN_CHARS = 200;
const OVERLAP_CHARS = 200;

interface ChunkInputDoc {
  title?: string;
  topic?: string;
  summary?: string;
  content_text?: string | null;
  // Free-form metadata (e.g. csv_row) — rendered as "label: value" lines into
  // the header chunk so directive names that live only in CSV fields (like
  // הנחיות משטרת ישראל's Data.Name) become searchable.
  metadata?: Record<string, string>;
}

export interface BuiltChunk {
  index: number;
  text: string; // raw chunk text (used for substring + snippet display)
  embeddingInput: string; // text fed to the embedding model (with header)
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function splitOnSentences(text: string): string[] {
  // Hebrew + Latin sentence terminators. Keeps the terminator with the part.
  const parts = text.split(/(?<=[.!?;׃׀])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

// PDF extraction sometimes produces chunks that are mostly punctuation/dots
// (table-of-contents leaders, page-number bands, ASCII boxes). Embeddings of
// these chunks become "average" vectors that score moderately against random
// short queries — exactly the noise we don't want. Drop them at index time.
function isMostlyJunk(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 80) return false; // headers / short titles are fine
  let real = 0;
  for (const ch of trimmed) {
    // Letter or digit in any script (Hebrew, Latin, Arabic numerals, ...).
    if (/[\p{L}\p{N}]/u.test(ch)) real++;
  }
  return real / trimmed.length < 0.5;
}

// Split a piece of text greedily into windows ≤ MAX_CHARS, ≥ MIN_CHARS where
// possible, with up to OVERLAP_CHARS of overlap between consecutive windows
// (helps semantic search when a sentence straddles a boundary).
function splitOversizedBlock(block: string): string[] {
  if (block.length <= MAX_CHARS) return [block];
  const sentences = splitOnSentences(block);
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length + 1 > MAX_CHARS && current.length >= MIN_CHARS) {
      out.push(current);
      // Carry overlap from the tail of the previous chunk.
      current = current.slice(-OVERLAP_CHARS) + " " + s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) out.push(current);

  // Last-resort: if a single sentence is still huge (e.g. malformed PDF),
  // hard-cut into MAX_CHARS slices.
  return out.flatMap((c) => {
    if (c.length <= MAX_CHARS) return [c];
    const slices: string[] = [];
    for (let i = 0; i < c.length; i += MAX_CHARS - OVERLAP_CHARS) {
      slices.push(c.slice(i, i + MAX_CHARS));
    }
    return slices;
  });
}

export function chunkGuideline(doc: ChunkInputDoc): BuiltChunk[] {
  const title = (doc.title ?? "").trim();
  const topic = (doc.topic ?? "").trim();
  const summary = (doc.summary ?? "").trim();
  const body = (doc.content_text ?? "").trim();

  // Header chunk — always emit one even when the body is missing, so the
  // metadata (title/topic/summary) is searchable on its own.
  const headerParts: string[] = [];
  if (title) headerParts.push(title);
  if (topic) headerParts.push(`תחום: ${topic}`);
  if (summary) headerParts.push(summary);
  const metadataLines: string[] = [];
  if (doc.metadata) {
    for (const [k, v] of Object.entries(doc.metadata)) {
      const value = (v ?? "").toString().trim();
      if (!value) continue;
      metadataLines.push(`${k}: ${value}`);
    }
  }
  if (metadataLines.length > 0) headerParts.push(metadataLines.join("\n"));
  const headerText = headerParts.join("\n\n");

  const chunks: BuiltChunk[] = [];
  if (headerText) {
    chunks.push({
      index: 0,
      text: headerText,
      embeddingInput: headerText,
    });
  }

  if (!body) return chunks;

  // Group paragraphs greedily until we hit the target size.
  const paragraphs = splitParagraphs(body);
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

  // Expand any oversized groups into windowed sub-chunks.
  const finalChunks: string[] = grouped
    .flatMap(splitOversizedBlock)
    .filter((c) => !isMostlyJunk(c));

  for (let i = 0; i < finalChunks.length; i++) {
    const chunkText = finalChunks[i];
    // Prefix the title/topic to each chunk's embedding input so similarity
    // stays anchored to the document context, even mid-body.
    const embedHeader = title || topic ? `${title}${topic ? ` (${topic})` : ""}\n\n` : "";
    chunks.push({
      index: chunks.length,
      text: chunkText,
      embeddingInput: `${embedHeader}${chunkText}`,
    });
  }

  return chunks;
}
