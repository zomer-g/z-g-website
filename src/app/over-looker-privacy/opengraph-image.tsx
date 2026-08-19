import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מדיניות פרטיות";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מחבר Looker Studio",
    title: "מדיניות פרטיות",
    subtitle: "מה נשלח לשרת, למה המחבר אינו ניגש לחשבון Google, ומה נשמר ביומנים.",
  });
}
