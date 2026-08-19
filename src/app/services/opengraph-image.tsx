import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תחומי עיסוק";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "תחומי עיסוק",
    title: "תחומי עיסוק",
    subtitle: "דין פלילי, ליווי חשודים ונאשמים, ייעוץ לפני חקירה וייצוג נפגעי עבירה.",
  });
}
