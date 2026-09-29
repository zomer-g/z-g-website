/**
 * Brand colour per media outlet, for the banner a publication card shows when
 * it has no thumbnail image. Every background carries white text at ≥4.5:1
 * (WCAG AA for the small title lines) — several outlets' own reds and greens
 * were darkened a step to get there.
 *
 * Sources are free text in the DB ("דה־מרקר", "TheMarker", "העין השביעית —
 * קול העין"), so matching is on a normalised substring, first hit wins.
 */

export interface MediaBrand {
  /** Name shown on the banner. */
  label: string;
  bg: string;
  accent: string;
}

const BRANDS: { match: string[]; brand: MediaBrand }[] = [
  { match: ["themarker", "דהמרקר"], brand: { label: "TheMarker", bg: "#02754d", accent: "#7ee2b8" } },
  { match: ["הארץ", "haaretz"], brand: { label: "הארץ", bg: "#1d5fc9", accent: "#bcd4ff" } },
  { match: ["גלובס", "globes"], brand: { label: "גלובס", bg: "#97133f", accent: "#ffc2d6" } },
  { match: ["כלכליסט", "calcalist"], brand: { label: "כלכליסט", bg: "#c40000", accent: "#ffd1d1" } },
  { match: ["=ice"], brand: { label: "ice", bg: "#282835", accent: "#5aa9ff" } },
  { match: ["העיןהשביעית"], brand: { label: "העין השביעית", bg: "#b3101d", accent: "#ffd0d3" } },
  { match: ["שומרים"], brand: { label: "שומרים", bg: "#293e57", accent: "#5fd0d8" } },
  { match: ["רשת13"], brand: { label: "רשת 13", bg: "#011d6b", accent: "#ff6b6b" } },
  { match: ["וואלה", "walla"], brand: { label: "וואלה", bg: "#1f4fa3", accent: "#bcd4ff" } },
  { match: ["רשותהרבים"], brand: { label: "רשות הרבים", bg: "#150b47", accent: "#d3b574" } },
  { match: ["lawcoil"], brand: { label: "law.co.il", bg: "#2f3847", accent: "#6fb3e8" } },
  { match: ["המקוםהכיחם"], brand: { label: "המקום הכי חם בגיהנום", bg: "#212121", accent: "#ff5a6e" } },
  { match: ["התמנון"], brand: { label: "התמנון", bg: "#3f0202", accent: "#e07cf2" } },
  { match: ["מאקו", "mako"], brand: { label: "mako", bg: "#16213e", accent: "#8fb8ff" } },
  { match: ["גיקטיים", "geektime"], brand: { label: "גיקטיים", bg: "#0a4da2", accent: "#bfe0ff" } },
  { match: ["ישראלהיום", "israelhayom"], brand: { label: "ישראל היום", bg: "#0b3d91", accent: "#ffd166" } },
  { match: ["כיפה", "kipa"], brand: { label: "כיפה", bg: "#0d5c63", accent: "#9be7ee" } },
  { match: ["ערוץ7", "israelnationalnews", "arutz"], brand: { label: "ערוץ 7", bg: "#003a70", accent: "#9ccaff" } },
  { match: ["כיכרהשבת"], brand: { label: "כיכר השבת", bg: "#1f4e79", accent: "#b7d7f5" } },
  { match: ["בבלי"], brand: { label: "בבלי", bg: "#4a2c6d", accent: "#d9c2f5" } },
  { match: ["ביזפורטל", "bizportal"], brand: { label: "ביזפורטל", bg: "#0b4f8a", accent: "#a9d4ff" } },
  { match: ["newsru"], brand: { label: "NEWSru.co.il", bg: "#8b0000", accent: "#ffc9c9" } },
  { match: ["jfeed"], brand: { label: "JFeed", bg: "#1e3a8a", accent: "#bcd0ff" } },
  { match: ["israeltechinsider"], brand: { label: "Israel Tech Insider", bg: "#111827", accent: "#7dd3fc" } },
  { match: ["שקוף"], brand: { label: "שקוף", bg: "#1d1d1b", accent: "#ffd43b" } },
  { match: ["תקדין"], brand: { label: "תקדין", bg: "#7a1f1f", accent: "#ffcdcd" } },
  { match: ["ביתהמשפט"], brand: { label: "בית המשפט", bg: "#2b3a55", accent: "#c9a84c" } },
  { match: ["המכוןהישראלילדמוקרטיה"], brand: { label: "המכון הישראלי לדמוקרטיה", bg: "#004b87", accent: "#9fd0ff" } },
  { match: ["כרטוגרפיה"], brand: { label: "כנס הכרטוגרפיה וממ״ג", bg: "#0f4c5c", accent: "#9ee3d6" } },
];

const DEFAULT = { bg: "#1a365d", accent: "#c9a84c" };

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9א-ת]+/g, "");

export function mediaBrand(source: string): MediaBrand {
  const n = normalize(source);
  for (const { match, brand } of BRANDS) {
    if (match.some((m) => (m.startsWith("=") ? n === normalize(m.slice(1)) : n.includes(normalize(m))))) return brand;
  }
  return { label: source, ...DEFAULT };
}
