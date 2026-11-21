import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מדיניות פרטיות: Magna Clipper";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "Magna Clipper",
    title: "מדיניות פרטיות",
    subtitle: "מדיניות הפרטיות של תוסף הדפדפן Magna Clipper.",
  });
}
