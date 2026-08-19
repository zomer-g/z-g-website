import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תמיכה ושאלות נפוצות";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "כלים משפטיים",
    title: "תמיכה ושאלות נפוצות",
    subtitle: "מענה לתקלות נפוצות ודרכי פנייה לתמיכה בתוסף.",
  });
}
