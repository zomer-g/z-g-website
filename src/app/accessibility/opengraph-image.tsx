import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "הצהרת נגישות";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מסמכי האתר",
    title: "הצהרת נגישות",
    subtitle: "עמידה בתקן WCAG 2.1 ואמצעי הנגישות באתר.",
  });
}
