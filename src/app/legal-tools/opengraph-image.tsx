import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "כלים משפטיים";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "תוסף Google Docs",
    title: "כלים משפטיים",
    subtitle: "ניהול ישויות משפטיות, נספחים והערות שוליים בתוך המסמך.",
  });
}
