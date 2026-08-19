import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "ניגוד עניינים לעם";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "תוסף Chrome",
    title: "ניגוד עניינים לעם",
    subtitle: "מסמן אישי ציבור, חברות ועמותות בכל אתר ומציג את מפת הקשרים שלהם.",
  });
}
