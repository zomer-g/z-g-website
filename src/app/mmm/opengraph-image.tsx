import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מסמכי מרכז המחקר והמידע של הכנסת";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר ציבורי",
    title: "מסמכי מרכז המחקר והמידע של הכנסת",
    subtitle: "חיפוש חופשי בתוך תוכן מסמכי מ.מ.מ, עם גישה ישירה לקבצים המקוריים.",
  });
}
