import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "הסדרים מותנים";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר ציבורי",
    title: "הסדרים מותנים",
    subtitle: "הסדרים מותנים של המשטרה, הפרקליטות ומשרד העבודה — חיפוש, סינון ומיון.",
  });
}
