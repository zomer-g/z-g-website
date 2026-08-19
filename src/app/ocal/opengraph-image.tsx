import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "Ocal — יומן לעם";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "תוסף Chrome",
    title: "Ocal — יומן לעם",
    subtitle: "מסמן שמות של נבחרי ציבור בכל דף ומציג את הפגישות האחרונות שלהם.",
  });
}
