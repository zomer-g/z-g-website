import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מאגר הנחיות יועמ\"ש, פרקליט המדינה ומשטרה";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר ציבורי",
    title: "מאגר הנחיות יועמ\"ש, פרקליט המדינה ומשטרה",
    subtitle: "חיפוש חופשי בהנחיות ובנהלים של רשויות האכיפה, עם גישה לקבצים המקוריים.",
    tags: ["שירות חינמי לציבור"],
  });
}
