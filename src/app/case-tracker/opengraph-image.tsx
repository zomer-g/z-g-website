import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "איתור אסמכתאות משפטיות";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "תוסף Chrome",
    title: "איתור אסמכתאות משפטיות",
    subtitle: "מזהה אסמכתאות לתיקים משפטיים ישראליים בכל דף ומציג תקצירי פסיקה.",
  });
}
