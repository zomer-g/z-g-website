import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "הפליליסט הדיגיטלי";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "בלוג אישי",
    title: "הפליליסט הדיגיטלי",
    subtitle: "פרספקטיבה אישית על המשפט הפלילי, מערכת המשפט והחיים שסביבם.",
  });
}
