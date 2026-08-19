import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מדיניות פרטיות";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מסמכי האתר",
    title: "מדיניות פרטיות",
    subtitle: "איסוף, שימוש ושמירה של נתונים אישיים באתר.",
  });
}
