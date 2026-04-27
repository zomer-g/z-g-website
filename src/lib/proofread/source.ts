// Parse the synthetic source string emitted by the collector
// (e.g. "db:Page[home]:content.hero.title", "defaults:home.hero.title",
// "db:Post[slug]:content.content[0].content[2].text") into a structured form
// we can use to look up or update the actual DB value.

export type ParsedSource =
  | {
      type: "defaults";
      slug: string;
      path: string[];
    }
  | {
      type: "db";
      table: "Page" | "Post" | "Service" | "MediaAppearance";
      key: string;
      path: string[];
    };

const DB_RE = /^db:([A-Z][a-zA-Z]+)\[([^\]]+)\]:(.*)$/;

function parsePath(s: string): string[] {
  if (!s) return [];
  const out: string[] = [];
  for (const seg of s.split(".")) {
    const m = seg.match(/^([^[]*)((?:\[\d+\])*)$/);
    if (!m) continue;
    if (m[1]) out.push(m[1]);
    if (m[2]) {
      for (const idx of m[2].matchAll(/\[(\d+)\]/g)) out.push(idx[1]);
    }
  }
  return out;
}

export function parseSource(source: string): ParsedSource | null {
  if (source.startsWith("defaults:")) {
    const rest = source.slice("defaults:".length);
    const dotIdx = rest.indexOf(".");
    const slug = dotIdx === -1 ? rest : rest.slice(0, dotIdx);
    const tail = dotIdx === -1 ? "" : rest.slice(dotIdx + 1);
    return { type: "defaults", slug, path: parsePath(tail) };
  }

  const m = source.match(DB_RE);
  if (m) {
    const table = m[1];
    if (
      table !== "Page" &&
      table !== "Post" &&
      table !== "Service" &&
      table !== "MediaAppearance"
    ) {
      return null;
    }
    return {
      type: "db",
      table,
      key: m[2],
      path: parsePath(m[3]),
    };
  }

  return null;
}

export function getValueAtPath(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    if (Array.isArray(cur)) {
      cur = cur[Number(p)];
    } else {
      cur = (cur as Record<string, unknown>)[p];
    }
  }
  return cur;
}

// Walk the path and replace the leaf value. Returns true if the write
// succeeded; false if the path hit a missing branch or a non-object.
export function setValueAtPath(
  obj: unknown,
  path: string[],
  value: unknown,
): boolean {
  if (path.length === 0) return false;
  let cur: unknown = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    if (cur == null || typeof cur !== "object") return false;
    let next: unknown;
    if (Array.isArray(cur)) next = cur[Number(p)];
    else next = (cur as Record<string, unknown>)[p];
    if (next == null) return false;
    cur = next;
  }
  if (cur == null || typeof cur !== "object") return false;
  const last = path[path.length - 1];
  if (Array.isArray(cur)) {
    cur[Number(last)] = value;
  } else {
    (cur as Record<string, unknown>)[last] = value;
  }
  return true;
}

// Recursively pull all string leaves out of any sub-tree (Tiptap, plain
// objects, arrays) so we can build a readable context blurb without caring
// about the shape.
export function extractText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map(extractText)
      .filter((s) => s.length > 0)
      .join(" ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (Array.isArray(obj.content)) return extractText(obj.content);
    return Object.values(obj)
      .map(extractText)
      .filter((s) => s.length > 0)
      .join(" ");
  }
  return "";
}

// Computes a "before"/"after" context for a leaf at the given path, by
// looking at neighbouring children of the leaf's array-parent (if it has one).
export function buildContext(
  rootValue: unknown,
  path: string[],
): { before: string; after: string } {
  if (path.length === 0) return { before: "", after: "" };

  // Find the closest array ancestor.
  for (let depth = path.length - 1; depth >= 0; depth--) {
    const ancestorPath = path.slice(0, depth);
    const ancestor = getValueAtPath(rootValue, ancestorPath);
    if (Array.isArray(ancestor)) {
      const idxStr = path[depth];
      const idx = Number(idxStr);
      if (!Number.isInteger(idx)) continue;
      const before = idx > 0 ? extractText(ancestor[idx - 1]) : "";
      const after = idx < ancestor.length - 1 ? extractText(ancestor[idx + 1]) : "";
      return { before, after };
    }
  }

  return { before: "", after: "" };
}
