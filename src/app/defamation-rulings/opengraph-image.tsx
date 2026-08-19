import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "פסקי דין בלשון הרע";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר פסיקה",
    title: "פסקי דין בלשון הרע",
    subtitle: "פסקי דין אחרונים בעניין לשון הרע מבתי המשפט בישראל, מהחדש לישן.",
    tags: ["מתעדכן אוטומטית"],
  });
}
