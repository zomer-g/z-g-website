import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { findMirrorDoc } from "@/lib/rulings-mirror";

export const alt = "פסק דין";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Same scope → section mapping the detail page uses for its breadcrumb. */
const SCOPE_KICKER: Record<number, string> = {
  1: "גזרי דין בעבירות סמים",
  4: "פסקי דין בלשון הרע",
  6: "פסיקות חופש מידע",
};

const FALLBACK = {
  kicker: "מאגר פסיקה",
  title: "עדכוני פסיקה",
  subtitle: "החלטות ופסקי דין עדכניים בתחומים נבחרים.",
};

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) return renderOgBanner(FALLBACK);

  // Mirror only: a banner is not worth a TAG-IT round trip (nor its timeouts).
  const found = await findMirrorDoc(id).catch(() => null);
  if (!found) return renderOgBanner(FALLBACK);

  const doc = found.item as Record<string, unknown>;
  const ai = (doc.ai || doc.ai_analysis || {}) as Record<string, unknown>;
  const meta = (doc.meta || {}) as Record<string, unknown>;

  const caseName = pickString(ai["שם_התיק"], meta.case_name, doc.case_name, doc.filename);
  const court = pickString(ai["בית_משפט"], meta.court_name);
  const date = pickString(ai["תאריך_המסמך"], meta.document_date);

  return renderOgBanner({
    kicker: SCOPE_KICKER[found.scopeId] ?? "מאגר פסיקה",
    title: caseName ?? `פסק דין ${id}`,
    subtitle: pickString(ai["תקציר"], ai["תקציר_המסמך"], ai["כותרת_המסמך"], meta.document_title),
    tags: [court, date].filter((v): v is string => Boolean(v)),
  });
}
