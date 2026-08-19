import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "לץ המשפט";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "תוסף Chrome",
    title: "לץ המשפט",
    subtitle: "מוריד את כל מסמכי התיק מנט המשפט כ-ZIP עם אינדקס, ורשימות דיונים כ-CSV/ICS.",
    tags: ["הכול מקומי בדפדפן"],
  });
}
