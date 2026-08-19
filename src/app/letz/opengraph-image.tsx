import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "לץ — תוספי הדפדפן";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "סדרת תוספים",
    title: "לץ — תוספי הדפדפן",
    subtitle: "לץ המשפט, לץ הממשל ולץ הלמ\"ס — מידע ומסמכים ציבוריים בלחיצה אחת.",
  });
}
