/**
 * A very small TrueType reader: enough to measure a string's width in a
 * given font, which is all the OG banner renderer needs.
 *
 * Satori does its own line breaking, but it breaks *after* we have had to
 * reorder the text for RTL (see `text.ts`), and bidi reordering is only
 * correct per visual line. So we wrap the text ourselves — and to wrap we
 * need advance widths. Parsing `cmap` + `hmtx` out of the Heebo TTFs is
 * cheaper than pulling in a font library.
 */

type Metrics = {
  unitsPerEm: number;
  /** codepoint → advance width in font units */
  advances: Map<number, number>;
  fallbackAdvance: number;
};

const cache = new WeakMap<Buffer, Metrics>();

export function readMetrics(font: Buffer): Metrics {
  const cached = cache.get(font);
  if (cached) return cached;

  const tables = readTableDirectory(font);
  const head = tables.get("head");
  const hhea = tables.get("hhea");
  const hmtx = tables.get("hmtx");
  const cmap = tables.get("cmap");
  if (!head || !hhea || !hmtx || !cmap) {
    throw new Error("font is missing a table required for measuring");
  }

  const unitsPerEm = font.readUInt16BE(head + 18);
  const numberOfHMetrics = font.readUInt16BE(hhea + 34);

  const glyphAdvance = (glyphId: number) => {
    const index = Math.min(glyphId, numberOfHMetrics - 1);
    return font.readUInt16BE(hmtx + index * 4);
  };

  const advances = new Map<number, number>();
  for (const [codepoint, glyphId] of readCmap(font, cmap)) {
    advances.set(codepoint, glyphAdvance(glyphId));
  }

  const metrics: Metrics = {
    unitsPerEm,
    advances,
    // Unmapped characters render as .notdef; use glyph 0's own width.
    fallbackAdvance: glyphAdvance(0) || unitsPerEm / 2,
  };
  cache.set(font, metrics);
  return metrics;
}

/** Width of `text` at `fontSize` px, in px. */
export function measure(text: string, font: Buffer, fontSize: number) {
  const { unitsPerEm, advances, fallbackAdvance } = readMetrics(font);
  let units = 0;
  for (const char of text) {
    const codepoint = char.codePointAt(0)!;
    units += advances.get(codepoint) ?? fallbackAdvance;
  }
  return (units / unitsPerEm) * fontSize;
}

/* ─── TTF internals ─── */

function readTableDirectory(font: Buffer) {
  const numTables = font.readUInt16BE(4);
  const tables = new Map<string, number>();
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    tables.set(font.toString("ascii", record, record + 4), font.readUInt32BE(record + 8));
  }
  return tables;
}

/** Returns codepoint → glyph id for the best available unicode subtable. */
function readCmap(font: Buffer, cmap: number): Map<number, number> {
  const numSubtables = font.readUInt16BE(cmap + 2);
  let best = -1;
  let bestScore = -1;

  for (let i = 0; i < numSubtables; i++) {
    const record = cmap + 4 + i * 8;
    const platformId = font.readUInt16BE(record);
    const encodingId = font.readUInt16BE(record + 2);
    const offset = cmap + font.readUInt32BE(record + 4);
    const format = font.readUInt16BE(offset);
    if (format !== 4 && format !== 12) continue;
    // Prefer full-repertoire (4,10) / windows-unicode subtables.
    const score =
      (format === 12 ? 4 : 0) + (platformId === 3 ? 2 : 0) + (encodingId === 10 || encodingId === 1 ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = offset;
    }
  }
  if (best < 0) return new Map();

  return font.readUInt16BE(best) === 12 ? readCmap12(font, best) : readCmap4(font, best);
}

function readCmap4(font: Buffer, offset: number) {
  const map = new Map<number, number>();
  const segCountX2 = font.readUInt16BE(offset + 6);
  const segCount = segCountX2 / 2;
  const endCodes = offset + 14;
  const startCodes = endCodes + segCountX2 + 2;
  const idDeltas = startCodes + segCountX2;
  const idRangeOffsets = idDeltas + segCountX2;

  for (let seg = 0; seg < segCount; seg++) {
    const end = font.readUInt16BE(endCodes + seg * 2);
    const start = font.readUInt16BE(startCodes + seg * 2);
    if (start > end) continue;
    const delta = font.readInt16BE(idDeltas + seg * 2);
    const rangeOffset = font.readUInt16BE(idRangeOffsets + seg * 2);

    for (let code = start; code <= end && code !== 0xffff; code++) {
      let glyphId: number;
      if (rangeOffset === 0) {
        glyphId = (code + delta) & 0xffff;
      } else {
        const glyphIndexAddress = idRangeOffsets + seg * 2 + rangeOffset + (code - start) * 2;
        if (glyphIndexAddress + 2 > font.length) continue;
        glyphId = font.readUInt16BE(glyphIndexAddress);
        if (glyphId !== 0) glyphId = (glyphId + delta) & 0xffff;
      }
      if (glyphId !== 0) map.set(code, glyphId);
    }
  }
  return map;
}

function readCmap12(font: Buffer, offset: number) {
  const map = new Map<number, number>();
  const numGroups = font.readUInt32BE(offset + 12);
  for (let i = 0; i < numGroups; i++) {
    const group = offset + 16 + i * 12;
    const start = font.readUInt32BE(group);
    const end = font.readUInt32BE(group + 4);
    const startGlyph = font.readUInt32BE(group + 8);
    // Guard against pathological fonts claiming huge ranges.
    for (let code = start; code <= end && code - start < 0x10000; code++) {
      map.set(code, startGlyph + (code - start));
    }
  }
  return map;
}
