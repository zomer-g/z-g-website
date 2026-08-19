import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "גזרי דין בעבירות סמים";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מאגר פסיקה",
    title: "גזרי דין בעבירות סמים",
    subtitle: "גזרי דין אחרונים בעבירות סמים — עבירות, הרשעות, ענישה וסוגי הסמים.",
  });
}
