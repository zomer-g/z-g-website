import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תצוגת ווטסאפ";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "הדגמת ממשק",
    title: "תצוגת ווטסאפ",
    subtitle: "ממשק לבחינת חומרי ראייה ולהצגת התכתבויות.",
  });
}
