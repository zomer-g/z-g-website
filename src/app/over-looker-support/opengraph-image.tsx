import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תמיכה";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מחבר Looker Studio",
    title: "תמיכה",
    subtitle: "פתרונות לתקלות נפוצות: שגיאות SQL, מכסות ואישור המחבר.",
  });
}
