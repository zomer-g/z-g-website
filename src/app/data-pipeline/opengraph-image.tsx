import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "זרימת המידע";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאחורי הקלעים",
    title: "זרימת המידע",
    subtitle: "מפה אינטראקטיבית של הסקרייפרים, המאגרים והדשבורדים שמזינים זה את זה.",
  });
}
