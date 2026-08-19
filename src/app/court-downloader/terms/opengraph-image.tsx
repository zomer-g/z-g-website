import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תנאי שימוש";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "לץ המשפט",
    title: "תנאי שימוש",
    subtitle: "שימוש מותר, אחריות המשתמש, הגבלת אחריות ואי-תלות ברשות השופטת.",
  });
}
