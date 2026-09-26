import { getDocumentProxy } from "unpdf";

/**
 * Plain text of a PDF, readable for Hebrew.
 *
 * pdf.js hands text back in content-stream order. Court documents produced by
 * Word often draw each Hebrew word separately, left to right on the page, so
 * joining the items in stream order reverses every line. Instead the items are
 * grouped into lines by their y position and ordered by x — right to left for
 * a line with Hebrew in it. In such a line the brackets were stored as their
 * mirrored glyphs, so they are swapped back.
 *
 * A scanned PDF has no text layer and comes back with (almost) no text; the
 * caller reports that rather than guessing.
 */

const HEBREW = /[֐-׿]/;

interface Item {
  s: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function joinLine(items: Item[]): string {
  const rtl = items.some((i) => HEBREW.test(i.s));
  const sorted = [...items].sort((a, b) =>
    rtl ? b.x + b.w - (a.x + a.w) : a.x - b.x,
  );
  let text = "";
  let prev: Item | null = null;
  for (const it of sorted) {
    if (prev) {
      const gap = rtl ? prev.x - (it.x + it.w) : it.x - (prev.x + prev.w);
      if (gap > it.h * 0.15 && !text.endsWith(" ") && !it.s.startsWith(" ")) text += " ";
    }
    text += it.s;
    prev = it;
  }
  text = text.replace(/\s+/g, " ").trim();
  if (rtl) {
    text = text
      // Some fonts store Hebrew letters as Windows-1255 bytes, which pdf.js
      // reads as Latin-1 (0xF0 = נ comes out as ð). Map that block back.
      .replace(/[à-ú]/g, (c) => String.fromCharCode(0x05d0 + c.charCodeAt(0) - 0xe0))
      .replace(/[()]/g, (c) => (c === "(" ? ")" : "("))
      // A list number drawn as ".1" at the start of a right-to-left line.
      .replace(/^\.(\d+)\s/, "$1. ");
  }
  return text;
}

export interface PdfText {
  pages: string[];
  totalPages: number;
}

export async function extractPdfText(data: Uint8Array): Promise<PdfText> {
  const pdf = await getDocumentProxy(data);
  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: Item[] = [];
    for (const raw of content.items) {
      if (!("str" in raw) || raw.str.trim() === "") continue;
      items.push({
        s: raw.str,
        x: raw.transform[4],
        y: raw.transform[5],
        w: raw.width,
        h: Math.abs(raw.transform[3]) || 10,
      });
    }
    const lines: { y: number; items: Item[] }[] = [];
    for (const it of items) {
      const line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, it.h * 0.4));
      if (line) line.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }
    lines.sort((a, b) => b.y - a.y);
    pages.push(lines.map((l) => joinLine(l.items)).join("\n"));
  }
  return { pages, totalPages: pdf.numPages };
}
