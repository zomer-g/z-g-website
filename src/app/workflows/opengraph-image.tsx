import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "ניהול תהליכי עבודה";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "הדגמת ממשק",
    title: "ניהול תהליכי עבודה",
    subtitle: "ישויות ותהליכים משפטיים, כשכל אירוע מתויג בכמה ממדים.",
  });
}
