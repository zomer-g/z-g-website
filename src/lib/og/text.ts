/**
 * RTL text preparation for the OG banners.
 *
 * Satori (the renderer behind next/og) has no bidirectional text engine:
 * it draws glyphs in logical order, left to right, which turns Hebrew into
 * mirror writing. So we do the two jobs the browser would normally do —
 * line breaking, then bidi reordering of each resulting line — and hand
 * satori plain, already-visual strings.
 */
import bidiFactory from "bidi-js";
import { measure } from "./font-metrics";

const bidi = bidiFactory();

/** Logical → visual order for a single line, in an RTL paragraph. */
export function toVisual(line: string) {
  const levels = bidi.getEmbeddingLevels(line, "rtl");
  return bidi.getReorderedString(line, levels);
}

export type WrapOptions = {
  font: Buffer;
  fontSize: number;
  maxWidth: number;
  /** Extra lines are dropped and an ellipsis is added to the last one. */
  maxLines?: number;
};

/**
 * Greedy word wrap on the logical string, then bidi-reorder line by line.
 * Returns visual-order lines, ready to render top to bottom.
 */
export function wrapVisual(text: string, { font, fontSize, maxWidth, maxLines = 4 }: WrapOptions) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate, font, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = `${kept[maxLines - 1]}…`;
    while (last.length > 1 && measure(last, font, fontSize) > maxWidth) {
      last = `${last.slice(0, -2).trimEnd()}…`;
    }
    kept[maxLines - 1] = last;
    return kept.map(toVisual);
  }

  return lines.map(toVisual);
}
