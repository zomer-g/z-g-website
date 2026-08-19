import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "פסיקות חופש מידע";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר פסיקה",
    title: "פסיקות חופש מידע",
    subtitle: "פסקי דין בעתירות לפי חוק חופש המידע מבתי המשפט בישראל.",
    tags: ["מתעדכן אוטומטית"],
  });
}
