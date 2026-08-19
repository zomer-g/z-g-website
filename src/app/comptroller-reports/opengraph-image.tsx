import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מאגר דוחות מבקר המדינה";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר ציבורי",
    title: "מאגר דוחות מבקר המדינה",
    subtitle: "חיפוש חופשי בתוך תוכן הדוחות, סינון לפי גוף מבוקר ותאריך.",
    tags: ["שירות חינמי לציבור"],
  });
}
