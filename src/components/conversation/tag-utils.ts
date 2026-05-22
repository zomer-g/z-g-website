// Shared tag styling helpers. Auto-assigns a palette colour from a
// tag's name when the DB row doesn't carry an explicit `color`, so
// the same tag looks identical wherever it appears.

import type { TagRef } from "./types";

const PALETTE: { bg: string; text: string; border: string }[] = [
  { bg: "#dcfce7", text: "#166534", border: "#86efac" }, // green
  { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" }, // blue
  { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" }, // amber
  { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" }, // pink
  { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" }, // violet
  { bg: "#ccfbf1", text: "#115e59", border: "#5eead4" }, // teal
  { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" }, // red
  { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" }, // indigo
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns inline-style colours for a tag chip. If the tag carries an
 * explicit `color` we use it (with auto-contrast text); otherwise we
 * hash the name into the palette so colours stay stable across
 * sessions / users.
 */
export function tagStyle(tag: Pick<TagRef, "name" | "color">): {
  background: string;
  color: string;
  borderColor: string;
} {
  if (tag.color && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(tag.color)) {
    // Explicit colour: lighten background, darken text for legibility.
    // Naive — uses the colour as both bg + border, white text. Works
    // well for the saturated colours admins typically pick.
    return { background: tag.color, color: "#fff", borderColor: tag.color };
  }
  const c = PALETTE[hashName(tag.name) % PALETTE.length];
  return { background: c.bg, color: c.text, borderColor: c.border };
}
