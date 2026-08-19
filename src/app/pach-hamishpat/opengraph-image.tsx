import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "פח המשפט";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "סטטוס בזמן אמת",
    title: "פח המשפט",
    subtitle: "דיווחי משתמשים על תקלות במערכת נט המשפט — הכל במקום אחד.",
  });
}
