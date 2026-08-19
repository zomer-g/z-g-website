import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { fetchComptrollerById } from "@/lib/comptroller-upstream";

export const alt = "דוח מבקר המדינה";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const FALLBACK = {
  kicker: "מאגר ציבורי",
  title: "מאגר דוחות מבקר המדינה",
  subtitle: "חיפוש חופשי בתוך תוכן הדוחות, סינון לפי גוף מבוקר ותאריך.",
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) return renderOgBanner(FALLBACK);

  const doc = await fetchComptrollerById(id).catch(() => null);
  if (!doc) return renderOgBanner(FALLBACK);

  return renderOgBanner({
    kicker: doc.source_label || "דוח מבקר המדינה",
    title: doc.document_title || doc.filename || "דוח מבקר המדינה",
    subtitle: doc.summary || doc.topic || undefined,
    tags: [doc.document_date ?? ""].filter(Boolean),
  });
}
