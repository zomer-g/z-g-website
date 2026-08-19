import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "טכנולוגיה למשרדי עורכי דין";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "שירותים דיגיטליים",
    title: "טכנולוגיה למשרדי עורכי דין",
    subtitle: "ייעוץ והטמעה: LegalTech, ויזואליזציה, מודלי שפה והגנת פרטיות.",
  });
}
