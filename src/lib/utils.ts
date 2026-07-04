import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Sanitize a hyperlink href before it reaches the DOM. Blocks the URL schemes
 * that can execute script (`javascript:`, `data:`, `vbscript:`) — important
 * because rich-text/TipTap link marks let an editor (or imported content) set
 * an arbitrary href. Anything dangerous collapses to "#". Normal absolute,
 * relative, and mailto/tel links pass through unchanged.
 */
export function safeHref(href: unknown): string {
  if (typeof href !== "string") return "#";
  // Strip the control chars/whitespace (U+0000–U+0020) that browsers ignore
  // when parsing a scheme (e.g. "java\tscript:"), then test the leading scheme.
  const normalized = href.replace(/[\u0000-\u0020]+/g, "").toLowerCase();
  if (/^(javascript|data|vbscript):/.test(normalized)) return "#";
  return href;
}
