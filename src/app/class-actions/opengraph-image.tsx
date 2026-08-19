import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תובענות ייצוגיות שהוגשו";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר תובענות",
    title: "תובענות ייצוגיות שהוגשו",
    subtitle: "התובענות הייצוגיות האחרונות שהוגשו בבתי המשפט, עם קישור לכתבי הטענות.",
  });
}
