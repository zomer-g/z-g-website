import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "מיזמים";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "מיזמים",
    title: "מיזמים",
    subtitle: "מיזמים אקטיביסטיים בממשק שבין דאטה, משפט וטכנולוגיה.",
  });
}
