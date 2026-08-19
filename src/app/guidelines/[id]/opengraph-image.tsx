import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { getGuidelinesApiKey } from "@/lib/guidelines-upstream";
import type { Guideline } from "@/types/guideline";

export const alt = "הנחיה ממאגר ההנחיות הציבורי";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";

const FALLBACK = {
  kicker: "מאגר ציבורי",
  title: 'מאגר הנחיות יועמ"ש, פרקליט המדינה ומשטרה',
  subtitle: "חיפוש חופשי בהנחיות ובנהלים של רשויות האכיפה, עם גישה לקבצים המקוריים.",
};

/** Title-only lookup — deliberately thinner than the page's own fetch. */
async function getGuideline(id: number): Promise<Guideline | null> {
  const apiKey = getGuidelinesApiKey();
  if (!apiKey) return null;
  try {
    const res = await fetch(`${UPSTREAM}/${id}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Guideline;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) return renderOgBanner(FALLBACK);

  const doc = await getGuideline(id);
  if (!doc) return renderOgBanner(FALLBACK);

  return renderOgBanner({
    kicker: doc.source_label || "מאגר ההנחיות",
    title: doc.document_title || doc.filename || "הנחיה",
    subtitle: doc.summary || doc.topic || undefined,
    tags: [doc.directive_number ?? "", doc.document_date ?? ""].filter(Boolean),
  });
}
