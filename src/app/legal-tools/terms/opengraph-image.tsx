import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תנאי שימוש";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "כלים משפטיים",
    title: "תנאי שימוש",
    subtitle: "תנאי השימוש בתוסף ל-Google Docs.",
  });
}
