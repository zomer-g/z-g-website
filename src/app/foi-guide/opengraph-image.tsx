import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מדריך חופש המידע";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מדריך",
    title: "מדריך חופש המידע",
    subtitle: "המבחנים המשפטיים, הסייגים והפסיקה בחוק חופש המידע.",
  });
}
