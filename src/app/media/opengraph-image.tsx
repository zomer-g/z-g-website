import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "כתבות, מחקרים ופרסומים";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "פרסומים",
    title: "כתבות, מחקרים ופרסומים",
    subtitle: "כתבות תקשורת ופרסומים אקדמיים בנושאי חופש מידע, דאטה ומשפט.",
  });
}
