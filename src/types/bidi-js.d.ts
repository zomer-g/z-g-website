/**
 * Minimal typings for `bidi-js` (ships as untyped JS).
 *
 * Only the two entry points the OG banner renderer uses are declared; the
 * package exposes more (reorder segments, bracket maps) that we don't touch.
 */
declare module "bidi-js" {
  export interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }

  export interface Bidi {
    getEmbeddingLevels(text: string, baseDirection?: "ltr" | "rtl" | "auto"): EmbeddingLevels;
    getReorderedString(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number,
    ): string;
    getReorderedIndices(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number,
    ): number[];
    getMirroredCharacter(char: string): string | null;
  }

  export default function bidiFactory(): Bidi;
}
