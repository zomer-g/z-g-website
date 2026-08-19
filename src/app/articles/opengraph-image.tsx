import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מאמרים משפטיים";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאמרים",
    title: "מאמרים משפטיים",
    subtitle: "תובנות ומדריכים בתחומי המשפט הפלילי, חופש המידע והטכנולוגיה.",
  });
}
