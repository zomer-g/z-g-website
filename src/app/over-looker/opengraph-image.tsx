import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "גרסאות לעם ב-Looker Studio";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מחבר Looker Studio",
    title: "גרסאות לעם ב-Looker Studio",
    subtitle: "הזרמת טבלאות ושאילתות SQL ממאגר גרסאות לעם ישירות ל-Looker Studio.",
    tags: ["חינם, ללא הרשמה"],
  });
}
