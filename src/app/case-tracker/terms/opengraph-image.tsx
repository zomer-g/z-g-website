import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "תנאי שימוש";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "איתור אסמכתאות משפטיות",
    title: "תנאי שימוש",
    subtitle: "תנאי השימוש בתוסף לדפדפן Chrome.",
  });
}
