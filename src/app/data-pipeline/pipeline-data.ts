// Structural data for the /data-pipeline architecture map: the projects that
// scrape, store and consume information across the whole system, and the edges
// (who feeds whom) drawn between them. The STRUCTURE here (layers, order,
// edges, icons, ids) is fixed; the editable TEXT (name / tagline / description)
// is overlaid at render time from CMS content so the site owner can edit it
// in the admin — see DataPipelinePageContent.nodes.

export type PipelineLayer = "source" | "storage" | "consumer";

export type PipelineIcon =
  | "ScrollText"
  | "Globe2"
  | "Globe"
  | "DownloadCloud"
  | "FolderKanban"
  | "History"
  | "Scale"
  | "Newspaper"
  | "Calendar"
  | "Network"
  | "Puzzle";

export interface PipelineNode {
  id: string;
  layer: PipelineLayer;
  /** Display order within the layer (ascending). In the RTL layout, order 1
   *  sits rightmost. */
  order: number;
  name: string;
  codeName?: string;
  tagline: string;
  description: string;
  tags: string[];
  href?: string;
  icon: PipelineIcon;
}

export const PIPELINE_NODES: PipelineNode[] = [
  /* ── Collection: scrapers + browser extensions ── */
  {
    id: "court-downloader",
    layer: "source",
    order: 1,
    name: "Court Downloader",
    tagline: "סורק בתי המשפט",
    description:
      "גורד פסקי דין והחלטות מאתר בתי המשפט (court.gov.il) ומאתר בית המשפט העליון: חיפוש לפי מספר תיק, הורדת החלטות (PDF/HTML), יומני דיונים, ופנקס התובענות הייצוגיות (מטא-דאטה + כל ה-PDF-ים). פועל בארכיטקטורת שרת (Render) מול worker מקומי עם דפדפן אמיתי, עם API ציבורי ולוח מעקב משימות. כל המסמכים שנאספים מוזנים אל TAG-IT.",
    tags: ["בתי משפט", "פסקי דין", "תובענות ייצוגיות"],
    href: "https://github.com/zomer-g/court_downloader",
    icon: "DownloadCloud",
  },
  {
    id: "cwext",
    layer: "source",
    order: 2,
    name: "לץ המשפט",
    tagline: "תוסף דפדפן — נט המשפט",
    description:
      "תוסף Chrome לעורכי דין, מתמחים ובעלי דין: מזהה תיק בנט המשפט ומוריד את כל מסמכיו כ-ZIP עם אינדקס, וכן רשימות דיונים. חולק את תשתית הקוד עם Court Downloader, אך רץ לוקאלית בלבד בדפדפן המשתמש — הקבצים נשמרים אצלו, והוא אינו מזין אף מערכת אחרת בתהליך.",
    tags: ["תוסף Chrome", "נט המשפט", "מקומי"],
    href: "/court-downloader",
    icon: "Puzzle",
  },
  {
    id: "govil-scraper",
    layer: "source",
    order: 3,
    name: "govil-scraper",
    tagline: "סורק אתרי ממשלה",
    description:
      "פלטפורמת גריפה רב-רכיבית: האתר האחוד של הממשלה (gov.il), נדל״ן (עסקאות מרשות המסים, גם בהיקף ארצי מבוזר), שכבות GIS מ-GovMap, מאגרי data.gov.il ואתר צה״ל (idf.il). כל מה שנאסף מוזן כעדכון גרסה אל OVER.",
    tags: ["gov.il", "נדל״ן", "GovMap", "data.gov.il"],
    href: "https://github.com/zomer-g/govil-scraper",
    icon: "DownloadCloud",
  },
  {
    id: "govext",
    layer: "source",
    order: 4,
    name: "לץ הממשל",
    tagline: "תוסף דפדפן — אתרי ממשלה",
    description:
      "תוסף Chrome שמזהה מאגרי נתונים פתוחים באתרי ממשלה ישראליים (gov.il, נדל״ן, GovMap, מנהל התכנון ועוד) ומאפשר להוריד אותם בלחיצה כ-CSV/GeoJSON/ZIP. חולק את תשתית הקוד עם govil-scraper, אך רץ לוקאלית ועצמאית בדפדפן המשתמש ואינו מזין אף מערכת אחרת בתהליך.",
    tags: ["תוסף Chrome", "מאגרי ממשלה", "מקומי"],
    href: "/govscraper",
    icon: "Puzzle",
  },
  {
    id: "cbsext",
    layer: "source",
    order: 5,
    name: "לץ הלמ\"ס",
    tagline: "תוסף דפדפן — למ\"ס",
    description:
      "תוסף לאיסוף וניתוח נתונים מאתר הלשכה המרכזית לסטטיסטיקה (הלמ\"ס). התוסף היחיד בסדרה שמחובר לשרת של OVER — הוא ניגש דרכו לאינדקס המאגרים ומריץ מולו שאילתות (בקשה ותשובה).",
    tags: ["תוסף Chrome", "למ\"ס", "שאילתות ל-OVER"],
    icon: "Puzzle",
  },

  /* ── Storage, databases & APIs ── */
  {
    id: "tag-it",
    layer: "storage",
    order: 1,
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
    order: 2,
    name: "OVER — גרסאות לעם",
    codeName: "ckan-version-tracker",
    tagline: "ניהול מאגרים",
    description:
      "עוקב אחרי מאגרי המידע הפתוחים ב-data.gov.il, שבהם מידע חדש בדרך כלל דורס את הישן, ושומר עותק של כל גרסה. הגרסאות נשמרות ב\"מידע לעם\" (odata.org.il) וניתנות לשאילתת API. ניזון מ-govil-scraper. התוסף לץ הלמ\"ס מתחבר לשרת שלו כדי לגשת לאינדקס ולהריץ שאילתות. חלק מהמאגרים (כאלה שהם בעצם מסמכים) מועברים גם אל TAG-IT. חושף API ציבורי שמזין דשבורדים ב-Z-G ואת דשבורד העיתונאים.",
    tags: ["מאגרי מידע", "היסטוריית גרסאות", "API ציבורי"],
    href: "https://github.com/zomer-g/ckan-version-tracker",
    icon: "History",
  },
  {
    id: "ocal",
    layer: "storage",
    order: 3,
    name: "יומן לעם (OCAL)",
    tagline: "יומני נבחרי ציבור",
    description:
      "פלטפורמה אזרחית (ocal.org.il) שמתעדת ומנגישה את יומני הפעילות של נבחרי ציבור בישראל — ישיבות, אירועים ומפגשים. דשבורד העיתונאים מושך ממנה אירועים ומקשר ישויות (אנשים וגופים) שעולות בכתבות לאירועים שביומנים.",
    tags: ["נבחרי ציבור", "יומנים", "API"],
    href: "https://ocal.org.il",
    icon: "Calendar",
  },
  {
    id: "ocoi",
    layer: "storage",
    order: 4,
    name: "ניגוד עניינים לעם (OCOI)",
    tagline: "גרף ניגוד עניינים",
    description:
      "מאגר וגרף (ocoi.org.il) של הסדרי ניגוד עניינים של נושאי משרה ציבורית, שחולצו ממסמכים ממשלתיים. דשבורד העיתונאים מקשר ישויות מהכתבות לצמתים בגרף ומציג את הזיקות הכלכליות והעסקיות שלהן.",
    tags: ["ניגוד עניינים", "גרף קשרים", "API"],
    href: "https://www.ocoi.org.il",
    icon: "Network",
  },

  /* ── Consumers ── */
  {
    id: "z-g",
    layer: "consumer",
    order: 1,
    name: "אתר Z-G",
    tagline: "סדרת מיזמים משפטיים",
    description:
      "האתר הזה עצמו — מארח סדרה של דשבורדים ציבוריים (מאגר הנחיות, גזרי דין בעבירות סמים, סניגוריה ציבורית, תובענות ייצוגיות, דוחות מבקר המדינה, חופש מידע ועוד), שכולם נשענים על ה-API של TAG-IT ו-OVER כמקור הנתונים.",
    tags: ["דשבורדים", "שקיפות"],
    href: "/projects",
    icon: "Globe",
  },
  {
    id: "journalist-dashboard",
    layer: "consumer",
    order: 2,
    name: "דשבורד עיתונאים",
    tagline: "כלי לעיתונאים",
    description:
      "פלטפורמה לעיתונאים לחיפוש וניתוח מידע פתוח: חיפוש כתבות, קישור ישויות לאירועים ולניגודי עניינים, וכלי חיפוש אחוד למאגרי מידע. ניזון מ-TAG-IT ומ-OVER, וכן מיומן לעם (OCAL) ומניגוד עניינים לעם (OCOI) להעשרת ישויות.",
    tags: ["עיתונות", "מידע פתוח"],
    icon: "Newspaper",
  },
];

export interface PipelineEdge {
  from: string;
  to: string;
  label?: string;
  /** Arrowheads on both ends (data flows both directions). */
  bidirectional?: boolean;
}

export const PIPELINE_EDGES: PipelineEdge[] = [
  { from: "court-downloader", to: "tag-it" },
  { from: "govil-scraper", to: "over" },
  // לץ המשפט / לץ הממשל run locally only and push nothing into the pipeline —
  // they share code with their sibling scraper but are intentionally edgeless.
  // לץ הלמ"ס is the only extension wired to a server: it queries OVER's index.
  { from: "cbsext", to: "over", bidirectional: true },
  { from: "over", to: "tag-it", label: "חלק מהמאגרים הם מסמכים" },
  { from: "tag-it", to: "z-g" },
  { from: "tag-it", to: "journalist-dashboard" },
  { from: "over", to: "z-g" },
  { from: "over", to: "journalist-dashboard" },
  { from: "ocal", to: "journalist-dashboard" },
  { from: "ocoi", to: "journalist-dashboard" },
];

export const LAYER_LABELS: Record<PipelineLayer, string> = {
  source: "איסוף — סקרייפרים ותוספים",
  storage: "אחסון, מאגרים ו-API",
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
