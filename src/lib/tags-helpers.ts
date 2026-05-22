// Shared helpers + types for the tag endpoints. Both whatsapp and
// timeline use the same tag shape — the only difference is which
// table the rows live in, so we keep the logic identical and route
// each request to its own table from a thin per-feature handler.

export interface TagInput {
  name: string;
  color?: string | null;
}

// Loose hex-colour check — accepts "#abc", "#aabbcc", lowercase or
// uppercase. Stricter than nothing; not strict enough to reject every
// invalid value (e.g. allows #zzz). Good enough for an admin tool.
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function validateTagPayload(
  payload: unknown,
): { ok: true; data: TagInput } | { ok: false; error: string; status: number } {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "JSON לא תקין", status: 400 };
  }
  const p = payload as Record<string, unknown>;
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) return { ok: false, error: "שם תגית נדרש", status: 400 };
  if (name.length > 60) {
    return { ok: false, error: "שם ארוך מדי (עד 60 תווים)", status: 400 };
  }
  let color: string | null | undefined;
  if ("color" in p) {
    if (p.color === null || p.color === "") color = null;
    else if (typeof p.color === "string" && HEX_RE.test(p.color)) color = p.color;
    else
      return {
        ok: false,
        error: "color חייב להיות hex (#abc / #aabbcc) או null",
        status: 400,
      };
  }
  return { ok: true, data: { name, color } };
}
