import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "הוצאות בעתירות חופש מידע";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר פסיקה",
    title: "הוצאות בעתירות חופש מידע",
    subtitle: "פסיקות שבהן נפסקו הוצאות משפט בעתירות חופש מידע, מהחדש לישן.",
  });
}
