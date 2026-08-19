import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { fetchMmmById } from "@/lib/mmm-upstream";

export const alt = "מסמך מרכז המחקר והמידע של הכנסת";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const FALLBACK = {
  kicker: "מאגר ציבורי",
  title: "מסמכי מרכז המחקר והמידע של הכנסת",
  subtitle: "חיפוש חופשי בתוך תוכן מסמכי מ.מ.מ, עם גישה ישירה לקבצים המקוריים.",
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) return renderOgBanner(FALLBACK);

  const doc = await fetchMmmById(id).catch(() => null);
  if (!doc) return renderOgBanner(FALLBACK);

  return renderOgBanner({
    kicker: doc.doc_type || "מרכז המחקר והמידע של הכנסת",
    title: doc.document_title || doc.filename || "מסמך מ.מ.מ",
    subtitle: doc.summary || doc.topic || undefined,
    tags: [doc.document_date ?? ""].filter(Boolean),
  });
}
