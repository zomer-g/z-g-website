import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "אזור אישי";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "פח המשפט",
    title: "אזור אישי",
    subtitle: "סטטוס מעודכן ופעולות דיווח מהירות.",
  });
}
