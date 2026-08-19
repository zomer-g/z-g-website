import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מילון ז'רגון";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מילון",
    title: "מילון ז'רגון",
    subtitle: "ביטויים ומונחים שהמצאתי סביב משפט, טכנולוגיה ושקיפות ממשלתית.",
  });
}
