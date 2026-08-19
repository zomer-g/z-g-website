import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "עו\"ד גיא זומר";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "עורך דין פלילי וחופש מידע",
    title: "עו\"ד גיא זומר",
    subtitle: "ייצוג בחקירות ובהליכים פליליים, עתירות חופש מידע ותיקי לשון הרע — בגישה מבוססת דאטה.",
  });
}
