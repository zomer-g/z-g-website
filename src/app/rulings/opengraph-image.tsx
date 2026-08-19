import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "עדכוני פסיקה";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר פסיקה",
    title: "עדכוני פסיקה",
    subtitle: "החלטות ופסקי דין עדכניים בתחומים נבחרים.",
  });
}
