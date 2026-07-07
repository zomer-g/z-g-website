// Data for the /data-pipeline architecture map: the projects that scrape,
// store and consume information across the whole system, and the edges
// (who feeds whom) drawn between them. Kept as plain data so the diagram
// component only has to render — no content is CMS-managed here since
// this describes fixed infrastructure, not editable page copy.

export type PipelineLayer = "source" | "storage" | "consumer";

export interface PipelineNode {
  id: string;
  layer: PipelineLayer;
  col: 0 | 1;
  name: string;
  codeName?: string;
  tagline: string;
  description: string;
  tags: string[];
  href?: string;
  icon: "ScrollText" | "Globe2" | "FolderKanban" | "History" | "Scale" | "Newspaper";
}

export const PIPELINE_NODES: PipelineNode[] = [
  {
    id: "court-downloader",
    layer: "source",
    col: 0,
    name: "Court Downloader",
    tagline: "סורק בתי המשפט",
    description:
      "גורד פסקי דין והחלטות מאתר בתי המשפט (court.gov.il) ומאתר בית המשפט העליון: חיפוש לפי מספר תיק, הורדת החלטות (PDF/HTML), יומני דיונים, ופנקס התובענות הייצוגיות (מטא-דאטה + כל ה-PDF-ים). פועל בארכיטקטורת שרת (Render) מול worker מקומי עם דפדפן אמיתי, עם API ציבורי ולוח מעקב משימות. כל המסמכים שנאספים מוזנים אל TAG-IT.",
    tags: ["בתי משפט", "פסקי דין", "תובענות ייצוגיות"],
    href: "https://github.com/zomer-g/court_downloader",
    icon: "ScrollText",
  },
  {
    id: "govil-scraper",
    layer: "source",
    col: 1,
    name: "govil-scraper",
    tagline: "סורק אתרי ממשלה",
    description:
      "פלטפורמת גריפה רב-רכיבית: האתר האחוד של הממשלה (gov.il), נדל״ן (עסקאות מרשות המסים, גם בהיקף ארצי מבוזר), שכבות GIS מ-GovMap, מאגרי data.gov.il ואתר צה״ל (idf.il). כל מה שנאסף מוזן כעדכון גרסה אל OVER.",
    tags: ["gov.il", "נדל״ן", "GovMap", "data.gov.il"],
    href: "https://github.com/zomer-g/govil-scraper",
    icon: "Globe2",
  },
  {
    id: "tag-it",
    layer: "storage",
    col: 0,
    name: "TAG-IT",
    codeName: "smart-dms",
    tagline: "ניהול מסמכים",
    description:
      "מערכת ניהול מסמכים: מאפשרת העלאה, קטלוג, חיפוש והורדה של מסמכים — בעיקר פסקי דין והחלטות. חלק מהמסמכים מגיעים ישירות מ-Court Downloader, וחלק מועברים אליה מ-OVER. חושפת API שמזין את סדרת דשבורדי הפסיקה באתר Z-G ואת דשבורד העיתונאים.",
    tags: ["ניהול מסמכים", "API"],
    href: "https://github.com/zomer-g/smart-dms",
    icon: "FolderKanban",
  },
  {
    id: "over",
    layer: "storage",
    col: 1,
    name: "OVER — גרסאות לעם",
    codeName: "ckan-version-tracker",
    tagline: "ניהול מאגרים",
    description:
      "עוקב אחרי מאגרי המידע הפתוחים ב-data.gov.il, שבהם מידע חדש בדרך כלל דורס את הישן, ושומר עותק של כל גרסה. הגרסאות נשמרות ב\"מידע לעם\" (odata.org.il) וניתנות לשאילתת API. חלק מהמאגרים (כאלה שהם בעצם מסמכים) מועברים גם אל TAG-IT. חושפת API ציבורי שמזין דשבורדים ב-Z-G ואת דשבורד העיתונאים.",
    tags: ["מאגרי מידע", "היסטוריית גרסאות", "API ציבורי"],
    href: "https://github.com/zomer-g/ckan-version-tracker",
    icon: "History",
  },
  {
    id: "z-g",
    layer: "consumer",
    col: 0,
    name: "אתר Z-G",
    tagline: "סדרת מיזמים משפטיים",
    description:
      "האתר הזה עצמו — מארח סדרה של דשבורדים ציבוריים (מאגר הנחיות, גזרי דין בעבירות סמים, סניגוריה ציבורית, תובענות ייצוגיות, דוחות מבקר המדינה, חופש מידע ועוד), שכולם נשענים על ה-API של TAG-IT ו-OVER כמקור הנתונים.",
    tags: ["דשבורדים", "שקיפות"],
    href: "/projects",
    icon: "Scale",
  },
  {
    id: "journalist-dashboard",
    layer: "consumer",
    col: 1,
    name: "דשבורד עיתונאים",
    tagline: "כלי לעיתונאים",
    description:
      "פלטפורמה לעיתונאים לחיפוש וניתוח מידע פתוח: חיפוש כתבות, קישור ישויות לאירועים ולניגודי עניינים, וכלי חיפוש אחוד למאגרי מידע. חלק מהמאגרים שהיא מציגה ניזונים מ-TAG-IT ומ-OVER, לצד יומן לעם (Ocal) וניגוד עניינים לעם (OCOI).",
    tags: ["עיתונות", "מידע פתוח"],
    icon: "Newspaper",
  },
];

export interface PipelineEdge {
  from: string;
  to: string;
  label?: string;
}

export const PIPELINE_EDGES: PipelineEdge[] = [
  { from: "court-downloader", to: "tag-it" },
  { from: "govil-scraper", to: "over" },
  { from: "over", to: "tag-it", label: "חלק מהמאגרים הם מסמכים" },
  { from: "tag-it", to: "z-g" },
  { from: "tag-it", to: "journalist-dashboard" },
  { from: "over", to: "z-g" },
  { from: "over", to: "journalist-dashboard" },
];

export const LAYER_LABELS: Record<PipelineLayer, string> = {
  source: "איסוף — סקרייפרים",
  storage: "אחסון וניהול",
  consumer: "צריכה — API",
};

// ── Data packages ─────────────────────────────────────────────────────
// A curated sample of real data sets that travel through the pipeline,
// each as an explicit list of (from,to) hops. Every hop here must exist
// in PIPELINE_EDGES — selecting a package just highlights a subset of
// the already-drawn graph, it never adds new connections.

export interface DataPackage {
  id: string;
  title: string;
  subtitle: string;
  hops: [string, string][];
}

export const DATA_PACKAGES: DataPackage[] = [
  {
    id: "comptroller-reports",
    title: "דוחות מבקר המדינה",
    subtitle: "נאסף מאתרי ממשלה, מתועד ב-OVER וב-TAG-IT",
    hops: [
      ["govil-scraper", "over"],
      ["over", "tag-it"],
      ["tag-it", "z-g"],
      ["tag-it", "journalist-dashboard"],
    ],
  },
  {
    id: "drug-sentencing",
    title: "גזרי דין בעבירות סמים",
    subtitle: "פסקי דין מבתי המשפט",
    hops: [
      ["court-downloader", "tag-it"],
      ["tag-it", "z-g"],
    ],
  },
  {
    id: "class-actions",
    title: "תובענות ייצוגיות",
    subtitle: "פנקס התובענות הייצוגיות",
    hops: [
      ["court-downloader", "tag-it"],
      ["tag-it", "z-g"],
      ["tag-it", "journalist-dashboard"],
    ],
  },
  {
    id: "conditional-arrangements",
    title: "הסדרים מותנים",
    subtitle: "משטרה, פרקליטות ומשרד העבודה",
    hops: [
      ["govil-scraper", "over"],
      ["over", "z-g"],
    ],
  },
  {
    id: "real-estate-gis",
    title: 'נדל"ן ומפות ממשלתיות',
    subtitle: "עסקאות נדל״ן ושכבות GIS",
    hops: [
      ["govil-scraper", "over"],
      ["over", "journalist-dashboard"],
    ],
  },
  {
    id: "foi-costs",
    title: "הוצאות משפט בעתירות חופש מידע",
    subtitle: "פסיקה בעתירות חופש מידע",
    hops: [
      ["court-downloader", "tag-it"],
      ["tag-it", "z-g"],
    ],
  },
];
