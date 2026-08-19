import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";

export const alt = "אודות עו\"ד גיא זומר";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgBanner({
    kicker: "אודות",
    title: "אודות עו\"ד גיא זומר",
    subtitle: "הרקע, הניסיון והגישה — משפט פלילי שמשלב דאטה, טכנולוגיה ושקיפות ציבורית.",
  });
}
