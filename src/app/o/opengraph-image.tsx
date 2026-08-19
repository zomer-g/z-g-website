import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "לעם";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מקבץ אתרים אזרחיים",
    title: "לעם",
    subtitle: "מידע לעם, גרסאות לעם, יומן לעם וניגוד עניינים לעם — שקיפות ונגישות מידע.",
  });
}
