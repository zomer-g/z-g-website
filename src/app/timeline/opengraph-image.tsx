import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "ציר זמן";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "הדגמת ממשק",
    title: "ציר זמן",
    subtitle: "ממשק לאיסוף וניתוח פעולות חקירה, תכתובות, פגישות והערות סביב תיק יחיד.",
  });
}
