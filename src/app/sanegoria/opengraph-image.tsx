import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "סניגוריה ציבורית בהליכים פליליים";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "דשבורד נתונים",
    title: "סניגוריה ציבורית בהליכים פליליים",
    subtitle: "ניתוח ייצוג הסניגוריה הציבורית בישראל — תיקים, דיונים ועבירות.",
  });
}
