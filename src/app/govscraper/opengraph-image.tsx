import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "לץ הממשל";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "תוסף Chrome",
    title: "לץ הממשל",
    subtitle: "מזהה מאגרי נתונים באתרי ממשלה ומוריד אותם כ-CSV/GeoJSON/ZIP בלחיצה אחת.",
    tags: ["הכול מקומי בדפדפן"],
  });
}
