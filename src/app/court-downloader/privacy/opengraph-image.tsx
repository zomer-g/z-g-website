import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מדיניות פרטיות";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "לץ המשפט",
    title: "מדיניות פרטיות",
    subtitle: "כל העיבוד נשאר במחשב המשתמש — ללא שרת ביניים, אנליטיקס או טלמטריה.",
  });
}
