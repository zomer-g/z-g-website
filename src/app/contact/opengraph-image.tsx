import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "צור קשר";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "יצירת קשר",
    title: "צור קשר",
    subtitle: "קביעת פגישת ייעוץ ראשונית — טלפון, אימייל וטופס מקוון.",
  });
}
