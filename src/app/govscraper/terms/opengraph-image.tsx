import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תנאי שימוש";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "לץ הממשל",
    title: "תנאי שימוש",
    subtitle: "שימוש מותר, שימוש הוגן בשרתי המקור, אחריות המשתמש והגבלת אחריות.",
  });
}
