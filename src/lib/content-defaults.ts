import type {
  HomePageContent,
  AboutPageContent,
  ContactPageContent,
  HeaderContent,
  FooterContent,
  ServicesPageContent,
  ArticlesPageContent,
  HaplilistPageContent,
  MediaPageContent,
  ArticleDetailContent,
  ServiceDetailContent,
  ProjectsPageContent,
  DigitalServicesPageContent,
  SanegoriaPageContent,
  ClassActionsPageContent,
  GuidelinesPageContent,
  ComptrollerReportsPageContent,
  MmmPageContent,
  DefamationRulingsPageContent,
  FoiRulingsPageContent,
  FoiJudgmentsPageContent,
  FoiCostsPageContent,
  DrugSentencingPageContent,
  ConditionalArrangementsPageContent,
  DataPipelinePageContent,
  LeamPageContent,
  LetzPageContent,
} from "@/types/content";
import { PIPELINE_NODES } from "@/app/data-pipeline/pipeline-data";

/* ─── Default Content (matches current hardcoded site data) ─── */
/* This file is safe to import from both client and server components. */

export const DEFAULT_HOME_CONTENT: HomePageContent = {
  hero: {
    title: "משפט פלילי",
    titleAccent: "מזווית של דאטה וטכנולוגיה",
    description:
      "ייצוג פלילי שמשלב חשיבה אנליטית, הבנה עמוקה של מערכות מידע וניסיון טכנולוגי מעשי — כי הגנה טובה מתחילה מהבנת הנתונים.",
    ctaText: "לייעוץ ראשוני",
    ctaLink: "/contact",
    secondaryCtaText: "המיזמים",
    secondaryCtaLink: "/projects",
  },
  services: {
    title: "תחומי עיסוק",
    subtitle:
      "ליווי משפטי פלילי עם גישה אנליטית — מחקירות סמים ועבירות אלימות ועד ייצוג נפגעי עבירה ועתירות חופש מידע",
  },
  aboutPreview: {
    title: "עורך דין שמבין דאטה",
    paragraphs: [
      "לפני שנכנסתי לעולם המשפט, עבדתי כאנליסט וראש צוות דאטה בסטארטאפ בתחום האלגוריתמיקה של סאונד. הניסיון הזה לימד אותי לחשוב על בעיות דרך נתונים, מערכות ודפוסים — ואת הגישה הזו אני מביא לכל תיק פלילי.",
      "במקביל לעבודה המשפטית, אני מוביל מיזמים אקטיביסטיים שמחברים בין דאטה, משפט וטכנולוגיה — מנגשת מידע ממשלתי ועד מעקב אחר ניגודי עניינים של נושאי משרה. כי שקיפות ונגישות מידע הם הבסיס לדמוקרטיה בריאה.",
    ],
    ctaText: "הסיפור המלא",
    ctaLink: "/about",
  },
  projectsPreview: {
    title: "טכנולוגיה בשירות הציבור",
    subtitle: "מיזמים אקטיביסטיים שמחברים בין דאטה, משפט וטכנולוגיה",
    ctaText: "לכל המיזמים",
    ctaLink: "/projects",
  },
  articles: {
    title: "מאמרים ועדכונים",
    subtitle: "כתבות, ניתוחים ועדכונים בתחומי המשפט הפלילי, חופש מידע וטכנולוגיה",
    ctaText: "לכל המאמרים",
  },
  cta: {
    title: "בואו נדבר",
    description: "שיחת הייעוץ הראשונה היא ללא עלות וללא התחייבות. אשמח להבין את המצב, להסביר את האפשרויות, ולתת לכם בהירות — עם הפרספקטיבה הייחודית שמגיעה משילוב של משפט וטכנולוגיה.",
    ctaText: "צרו קשר עכשיו",
    ctaLink: "/contact",
    phone: "054-7650202",
    phoneHref: "tel:+972-54-7650202",
  },
};

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  hero: { title: "אודות", subtitle: "הכירו את עו\"ד זומר - מחויבות למצוינות, מקצועיות ושירות אישי לכל לקוח." },
  firmStory: {
    title: "הסיפור שלי",
    subtitle: "מסורת של מצוינות משפטית ושירות אישי",
    paragraphs: [
      "עו\"ד גיא זומר החל את דרכו מתוך חזון להעניק ללקוחותיו שירות משפטי ברמה הגבוהה ביותר, תוך שמירה על גישה אישית וקשובה. לאורך השנים ליווה מאות לקוחות - חברות מובילות, יזמים ולקוחות פרטיים - בתיקים מורכבים ומגוונים.",
      "כל לקוח הוא עולם ומלואו, ולכן מוקדש זמן ומשאבים להבנה מעמיקה של הצרכים הייחודיים של כל מקרה. הגישה משלבת ידע משפטי רחב עם הבנה עסקית מעשית, ומאפשרת להציע פתרונות יצירתיים ואפקטיביים.",
      'התמחות במגוון רחב של תחומי משפט, לרבות דיני חברות ומסחרי, נדל"ן ומקרקעין, ליטיגציה ויישוב סכסוכים, ועוד. הקפדה על עדכון מתמשך בפסיקה ובחקיקה החדשה, ויישום הידע הנרחב לטובת הלקוחות.',
      "לאורך השנים, נבנה מוניטין של מקצועיות, אמינות ותוצאות מוכחות. גאווה בקשרים ארוכי הטווח עם הלקוחות, ומחויבות להמשיך ולספק שירות משפטי איכותי ומותאם אישית.",
    ],
  },
  attorney: {
    name: 'עו"ד גיא זומר',
    role: "עורך דין פלילי",
    bio: [
      'עו"ד גיא זומר, בעל ניסיון עשיר בתחום המשפט הפלילי, מלווה לקוחות בכל שלבי ההליך הפלילי.',
      'מייצג חשודים ונאשמים בכל הערכאות, מייעץ לפני חקירות ומלווה לקוחות מהרגע הראשון ועד לסיום ההליך.',
    ],
    credentials: [
      { icon: "GraduationCap", text: "LL.B, הפקולטה למשפטים, אוניברסיטת תל אביב" },
      { icon: "BookOpen", text: "חבר לשכת עורכי הדין בישראל" },
      { icon: "Award", text: "ניסיון מקצועי נרחב בתחומי המשפט המסחרי" },
    ],
  },
  values: {
    title: "הערכים שמנחים אותי",
    subtitle: "העקרונות שמנחים כל פעולה וכל ייצוג משפטי",
    items: [
      { icon: "Award", title: "מקצועיות", description: "הקפדה על רמה מקצועית גבוהה בכל תיק ובכל ייעוץ. הכשרות מתמשכות ועדכון ידע באופן שוטף." },
      { icon: "Heart", title: "מחויבות", description: "מחויבות מלאה לכל לקוח. כל לקוח ראוי לקבל את מלוא תשומת הלב והמשאבים המקצועיים הנדרשים." },
      { icon: "ShieldCheck", title: "יושרה", description: "פעולה בשקיפות מלאה ובהתאם לסטנדרטים האתיים הגבוהים ביותר. אמינות ויושרה הם עקרונות היסוד." },
      { icon: "Lightbulb", title: "חדשנות", description: "אימוץ גישות חדשניות וכלים מתקדמים כדי להעניק לכל לקוח שירות משפטי יעיל ועדכני בהתאם לעולם המשתנה." },
    ],
  },
  cta: { title: "מוכנים לדבר?", description: "אשמח להכיר אתכם ולשמוע על הצרכים המשפטיים שלכם. פנו אליי לשיחת ייעוץ ראשונית ללא התחייבות.", ctaText: "צרו קשר", ctaLink: "/contact" },
};

export const DEFAULT_CONTACT_CONTENT: ContactPageContent = {
  hero: { title: "צור קשר", subtitle: "אשמח לשמוע מכם. מלאו את הטופס או צרו קשר באחת מהדרכים הבאות ואחזור אליכם בהקדם." },
  form: { title: "השאירו פרטים", phoneLabel: "טלפון", emailLabel: "אימייל", addressLabel: "כתובת", hoursLabel: "שעות פעילות" },
  contactInfo: { phone: "03-000-0000", phoneHref: "tel:+972-3-000-0000", email: "info@zomer-law.co.il", emailHref: "mailto:info@zomer-law.co.il", address: "רחוב הברזל 30, תל אביב", hours: "א׳-ה׳: 08:30-18:00" },
  consultationNote: { title: "ייעוץ ראשוני", description: "הפגישה הראשונית היא ללא עלות וללא התחייבות. מטרתה להבין את הצרכים שלכם ולבחון כיצד אוכל לסייע." },
};

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  logoText: "זומר",
  logoSubtext: "עורך דין",
  navItems: [
    { label: "ראשי", href: "/" },
    { label: "אודות", href: "/about" },
    // "שירותים דיגיטליים" carries hardcoded children so the demo
    // pages are always reachable from the header without a DB entry.
    {
      label: "שירותים דיגיטליים",
      href: "/digital-services",
      children: [
        { label: "ויזואליזציה של תיק — ממשק WhatsApp", href: "/whatsapp" },
        { label: "ויזואליזציה של תיק — ציר זמן", href: "/timeline" },
        { label: "ניהול קשרים מול גורמי אכיפה", href: "/workflows" },
      ],
    },
    // "מיזמים" + "תחומי עיסוק" both carry `children: []` as a marker
    // so PublicLayout knows to populate them at runtime. "מיזמים"
    // children come from DEFAULT_PROJECTS_CONTENT.projects; "תחומי
    // עיסוק" children come from the active Service rows in the DB.
    // Adding/disabling either in /admin auto-updates the header.
    { label: "מיזמים", href: "/projects", children: [] },
    { label: "תחומי עיסוק", href: "/services", children: [] },
    { label: "מאמרים", href: "/articles" },
    { label: "הפליליסט", href: "/haplilist" },
    { label: "פרסומים", href: "/media" },
    // "מילון" moved out of the top-level menu — it now lives under the
    // "מיזמים" dropdown (populated from the projects content).
    // "תובענות ייצוגיות" used to be a top-level entry — it lives
    // under /projects → /class-actions and is now in the "מיזמים"
    // dropdown, so dropping the dedicated link trims the menu
    // without hiding the page.
    { label: "צור קשר", href: "/contact" },
  ],
  ctaText: "ייעוץ ראשוני",
  ctaLink: "/contact",
};

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  firmName: "זומר",
  firmSubtext: "עורך דין",
  firmDescription: "עו\"ד זומר מספק ייצוג משפטי מקצועי וליווי עסקי מקיף. התמחות במגוון תחומי משפט תוך שירות אישי ומסור לכל לקוח.",
  quickLinksTitle: "קישורים מהירים",
  quickLinks: [
    { label: "אודות", href: "/about" },
    { label: "תחומי עיסוק", href: "/services" },
    { label: "מאמרים", href: "/articles" },
    { label: "פרסומים", href: "/media" },
    { label: "מיזמים", href: "/projects" },
    { label: "תובענות ייצוגיות", href: "/class-actions" },
    { label: "שירותים דיגיטליים", href: "/digital-services" },
    { label: "צור קשר", href: "/contact" },
  ],
  contactTitle: "צור קשר",
  contactInfo: { phone: "03-000-0000", phoneHref: "tel:+972-3-000-0000", email: "info@zomer-law.co.il", emailHref: "mailto:info@zomer-law.co.il", address: "תל אביב, ישראל", hours: "" },
  legalLinks: [
    { label: "הצהרת נגישות", href: "/accessibility" },
    { label: "מדיניות פרטיות", href: "/privacy" },
    { label: "תנאי שימוש", href: "/terms" },
  ],
  copyright: "עו\"ד זומר. כל הזכויות שמורות.",
};

/* ─── Services Listing Page ─── */

export const DEFAULT_SERVICES_CONTENT: ServicesPageContent = {
  hero: {
    title: "תחומי עיסוק",
    subtitle: "עו\"ד זומר מציע מגוון רחב של שירותים משפטיים, תוך שמירה על מקצועיות, מסירות ויחס אישי לכל לקוח.",
  },
  grid: {
    title: "השירותים",
    subtitle: "התמחות במגוון תחומי משפט וליווי משפטי ברמה הגבוהה ביותר.",
    emptyState: "תחומי העיסוק יתעדכנו בקרוב.",
    readMoreText: "קרא עוד",
  },
};

/* ─── Articles Listing Page ─── */

export const DEFAULT_ARTICLES_CONTENT: ArticlesPageContent = {
  hero: {
    title: "מאמרים",
    subtitle: "תובנות משפטיות, עדכוני חקיקה ומאמרים מקצועיים מעו\"ד זומר.",
  },
  grid: {
    title: "מאמרים אחרונים",
    subtitle: "מאמרים מקצועיים ועדכונים בתחומי המשפט השונים.",
    emptyStateTitle: "עדיין לא פורסמו מאמרים.",
    emptyStateSubtitle: "מאמרים חדשים יופיעו כאן בקרוב.",
    readMoreText: "קרא עוד",
  },
  cta: {
    title: "הישארו מעודכנים",
    description: "רוצים לקבל עדכונים על מאמרים חדשים ושינויי חקיקה? צרו קשר ואוסיף אתכם לרשימת התפוצה.",
    ctaText: "צרו קשר",
    ctaLink: "/contact",
  },
};

/* ─── Haplilist (personal blog listing page) ─── */

export const DEFAULT_HAPLILIST_CONTENT: HaplilistPageContent = {
  hero: {
    title: "הפליליסט",
    subtitle:
      "הבלוג האישי שלי — פרספקטיבה אישית על המשפט הפלילי, מערכת המשפט והאנשים שמאחורי התיקים.",
  },
  grid: {
    title: "הפוסטים האחרונים",
    subtitle: "מחשבות, דעות ותובנות מהשטח",
    emptyStateTitle: "עדיין אין פוסטים",
    emptyStateSubtitle: "הפוסט הראשון בדרך — חזרו בקרוב.",
    readMoreText: "קראו עוד",
  },
};

/* ─── Media Page ─── */

export const DEFAULT_MEDIA_CONTENT: MediaPageContent = {
  hero: {
    title: "פרסומים",
    subtitle: "כתבות תקשורת, מחקרים אקדמיים ופרסומים בנושאים משפטיים.",
  },
  grid: {
    title: "פרסומים",
    subtitle: "ריכוז הפרסומים התקשורתיים והאקדמיים",
    emptyState: "פרסומים יתעדכנו בקרוב.",
  },
  typeLabels: {
    video: "וידאו",
    article: "כתבה",
    podcast: "פודקאסט",
    academic: "מחקר / אקדמיה",
  },
};

/* ─── Article Detail Page ─── */

export const DEFAULT_ARTICLE_DETAIL_CONTENT: ArticleDetailContent = {
  disclaimer: {
    label: "הערה:",
    text: "מאמר זה מהווה מידע כללי בלבד ואינו מהווה ייעוץ משפטי. לקבלת ייעוץ משפטי מותאם לנסיבות הספציפיות שלכם, אנא",
    linkText: "צרו קשר",
    linkHref: "/contact",
  },
  sidebarCta: {
    title: "זקוקים לייעוץ משפטי?",
    description: "אשמח לסייע לכם בכל שאלה משפטית.",
    ctaText: "צרו קשר",
    ctaLink: "/contact",
  },
  strings: {
    breadcrumbHome: "ראשי",
    breadcrumbArticles: "מאמרים",
    sidebarRelatedTitle: "מאמרים נוספים",
    moreArticlesTitle: "עוד מאמרים שעשויים לעניין אותך",
    readMoreText: "קרא עוד",
    authorTemplate: "עו\"ד זומר, מתמחה ב{category}.",
  },
};

/* ─── Service Detail Page ─── */

export const DEFAULT_SERVICE_DETAIL_CONTENT: ServiceDetailContent = {
  strings: {
    breadcrumbHome: "ראשי",
    breadcrumbServices: "תחומי עיסוק",
    relatedServicesTitle: "תחומי עיסוק נוספים",
  },
};

/* ─── Projects Page ─── */

export const DEFAULT_PROJECTS_CONTENT: ProjectsPageContent = {
  hero: {
    title: "מיזמים",
    subtitle: "פרויקטים אקטיביסטיים בממשקים של דאטה, משפט וטכנולוגיה — כי שקיפות ונגישות מידע הם תנאי בסיסי לדמוקרטיה.",
  },
  projects: [
    {
      title: "הסדרים מותנים",
      subtitle: "מאגר הסדרים מותנים של המשטרה, הפרקליטות ומשרד העבודה",
      description: "דשבורד אינטראקטיבי המרכז את ההסדרים המותנים שפרסמה המשטרה, הפרקליטות ומשרד העבודה — מעל 34,000 הסדרים ממאגרי הממשלה, עם יכולות חיפוש AND, סינון לפי מחוז, יחידה, עבירה וטווח תאריכים. הנתונים מתעדכנים אוטומטית מ-odata.org.il.",
      url: "/conditional-arrangements",
      icon: "Scale",
      tags: ["הסדרים מותנים", "משטרה", "פרקליטות", "משרד העבודה", "דאטה משפטי"],
    },
    {
      title: "מאגר הנחיות",
      subtitle: 'הנחיות יועמ"ש, פרקליט המדינה ועוד — חיפוש מלא בתוכן',
      description: 'מאגר מאוחד של הנחיות והוראות מטעם רשויות אכיפת החוק והמינהל הציבורי בישראל — היועצת המשפטית לממשלה, פרקליט המדינה, המשטרה ועוד. הכלי מאפשר חיפוש מלא בתוכן ההנחיות (בפורמט Markdown) ולא רק בכותרות, סינון לפי מקור, וצפייה ישירה בקובץ ה-PDF המקורי או בטקסט שחולץ ממנו.',
      url: "/guidelines",
      icon: "BookOpen",
      tags: ["הנחיות", "פרקליטות", "יועמ\"ש", "חיפוש מלא"],
    },
    {
      title: "דשבורד סניגוריה ציבורית",
      subtitle: "ניתוח ייצוג סניגוריה ציבורית בהליכים פליליים",
      description: "דשבורד אינטראקטיבי הסוקר את ייצוג הסניגוריה הציבורית בהליכים פליליים בישראל מ-2022 ואילך. הכלי משווה תיקים, דיונים, עבירות ופסקי דין בין תיקים שיוצגו על ידי הסניגוריה הציבורית לבין כאלה שלא — ומאפשר לציבור, לחוקרים ולמערכת המשפט לראות בעיניים נתוניות את תרומת הסניגוריה הציבורית להליך הפלילי.",
      url: "/sanegoria",
      icon: "BarChart3",
      tags: ["סניגוריה ציבורית", "הליכים פליליים", "דאטה משפטי"],
    },
    {
      title: "דשבורד תובענות ייצוגיות",
      subtitle: "תובענות ייצוגיות אחרונות שהוגשו",
      description: "פלטפורמה המנגישה את התובענות הייצוגיות החדשות שנפתחו בפנקס התובענות הייצוגיות, לרבות שם התיק, בית המשפט, סעד מבוקש, הגדרת הקבוצה והשאלה המשפטית — עם קישור ישיר לכתבי הטענות. הכלי מאפשר לציבור ולעורכי דין לעקוב בזמן אמת אחר ההתפתחויות בתחום ולזהות מגמות בהגשת תובענות ייצוגיות.",
      url: "/class-actions",
      icon: "Scale",
      tags: ["תובענות ייצוגיות", "פנקס תובענות", "גישה למידע"],
    },
    {
      title: "פרויקט לעם",
      subtitle: "אתרים אזרחיים לשקיפות ממשלתית",
      description: "מיזם מטריית שמפעיל מספר כלים לשקיפות ממשלתית: מידע לעם (פורטל המידע הפתוח הישראלי), גרסאות לעם (מעקב היסטוריית עדכוני מאגרי ממשלה), יומן לעם (מעקב אחר פעילות נבחרי ציבור) וניגוד עניינים לעם (מאגר הסדרי ניגוד עניינים). כולם מאמינים שהנתונים שלנו באמת שלנו.",
      url: "/o",
      icon: "Globe",
      tags: ["מידע פתוח", "שקיפות ממשלתית", "אחריותיות", "נבחרי ציבור"],
    },
    {
      title: "לץ — תוספי דפדפן",
      subtitle: "סדרת תוספי Chrome להורדת מידע ציבורי בלחיצה",
      description: "סדרת תוספי דפדפן שהופכים מאגרי מידע ומסמכים ציבוריים לקבצים מסודרים, מקומית בדפדפן וללא שרת ביניים: לץ המשפט (מסמכים מנט המשפט), לץ הממשל (מאגרי נתונים מאתרי ממשלה) ולץ הלמ״ס (נתוני הלשכה המרכזית לסטטיסטיקה).",
      url: "/letz",
      icon: "Puzzle",
      tags: ["תוספי דפדפן", "מידע פתוח", "הורדה מקומית"],
    },
    {
      title: "פח המשפט",
      subtitle: "סטטוס נט המשפט בזמן אמת — דיווחים קהילתיים",
      description: "פלטפורמה קהילתית שעוקבת אחרי הזמינות של נט המשפט. כל משתמש יכול לדווח על תקלה (מערכת קרסה / תקלה חלקית) או לאשר שהמערכת חזרה לתקנה, וכולם רואים את הסטטוס הנוכחי. בנוסף — הודעות מערכת ועדכוני מנהל, יומן דיווחים ותגובות קהילה.",
      url: "/pach-hamishpat",
      icon: "Trash2",
      tags: ["נט המשפט", "דיווח קהילתי", "סטטוס בזמן אמת"],
    },
    {
      title: "מילון",
      subtitle: "מילון מונחים משפטיים — הלקסיקון של המונחים שטבעתי",
      description: "מילון עברי של מונחים משפטיים שטבעתי, המנגיש רעיונות ותופעות מעולם המשפט הפלילי והמנהלי בשפה ברורה. כל ערך מסביר את המונח, ההקשר שבו הוא נולד והשימוש בו.",
      url: "/dictionary",
      icon: "BookOpen",
      tags: ["מילון", "מונחים משפטיים", "שפה משפטית"],
    },
    {
      title: "זרימת המידע",
      subtitle: "מפה אינטראקטיבית של איך המערכות שלי מתחברות זו לזו",
      description: "מפה של תהליך זרימת המידע בין הפרויקטים: סקרייפרים שאוספים מבתי המשפט ומאתרי ממשלה, מערכות ניהול המסמכים והמאגרים (TAG-IT ו-OVER), ושורת האתרים והדשבורדים שניזונים מהם. לחיצה על כל פרויקט מציגה הסבר קצר עליו.",
      url: "/data-pipeline",
      icon: "Workflow",
      tags: ["ארכיטקטורה", "סקרייפרים", "API", "שקיפות"],
    },
  ],
  cta: {
    title: "רוצים לשתף פעולה?",
    description: "יש לכם רעיון לפרויקט בתחומי הדאטה, המשפט והטכנולוגיה? אשמח לשמוע.",
    ctaText: "צרו קשר",
    ctaLink: "/contact",
  },
};

/* ─── Digital Services Page ─── */

export const DEFAULT_DIGITAL_SERVICES_CONTENT: DigitalServicesPageContent = {
  hero: {
    title: "שירותים דיגיטליים",
    subtitle: "ייעוץ והטמעת טכנולוגיה למשרדי עורכי דין ועסקים",
  },
  intro: {
    title: "טרנספורמציה דיגיטלית בעולם המשפט",
    paragraphs: [
      "ענף המשפט בישראל ניצב בפתחה של תקופה שבה הטכנולוגיה מפסיקה להיות כלי עזר שולי והופכת לליבת העיסוק המקצועי. משרד שאינו מאמץ פתרונות טכנולוגיים מתקדמים נותר מאחור — הן מבחינת היכולת לנהל תיקים מרובי מסמכים, והן מבחינת היכולת לספק שירות הולם ללקוחות המצפים לשקיפות ומהירות.",
      "הטמעת כלים טכנולוגיים אינה מסתכמת ברכישת רישיון לתוכנה. מדובר בשינוי פרדיגמה ארגונית הדורש אפיון מדויק של צרכי המשרד, התאמה לסביבה הרגולטורית הישראלית, ובניית תהליכי עבודה שמבטיחים שהטכנולוגיה תשרת את עורך הדין — ולא תכביד עליו.",
      "השירותים שלהלן מתמקדים בשלושה עמודי תווך: ניהול קשרים ומידע מול גורמי אכיפה, ויזואליזציה של ניתוח התיק המשפטי, והטמעה של מודלי שפה (LLM) לניהול תכנים מורכבים. פתרון קצה לקצה, מאיסוף הנתונים ועד הצגת הראיות בבית המשפט.",
    ],
  },
  services: {
    title: "שירותים ופתרונות",
    subtitle: "פתרונות טכנולוגיים מותאמים לעולם המשפט והעסקים",
  },
  items: [
    {
      title: "ויזואליזציה של תיק משפטי",
      subtitle: "מיפוי חזותי לניתוח אסטרטגי",
      description: "מיפוי חזותי של ראיות, עדים, לוחות זמנים וקשרים בין שחקנים בתיק. הכלי מאפשר לזהות דפוסים, סתירות וחולשות בתיק באופן ויזואלי — ולהציג ממצאים בצורה ברורה בבית המשפט.",
      icon: "Eye",
      tags: ["ויזואליזציה", "ניתוח ראיות", "מיפוי"],
    },
    {
      title: "ניהול קשרים מול גורמי אכיפה",
      subtitle: "CRM משפטי מותאם",
      description: "מערכת מותאמת למעקב אחר תכתובות, מועדים והתכתבויות עם פרקליטות, משטרה ורשויות. ניהול מרכזי של כל נקודות המגע בתיק, כולל התראות אוטומטיות למועדים קריטיים וארכיון חכם של תכתובות.",
      icon: "Database",
      tags: ["CRM", "ניהול תיקים", "אכיפה"],
    },
    {
      title: "הטמעת מודלי שפה (LLM)",
      subtitle: "AI לניהול מסמכים משפטיים",
      description: "עיבוד ותמצות מסמכים, הכנת סיכומים אוטומטיים וחיפוש חכם בחומר ראייתי. התאמה לעברית משפטית ולמבנים ייחודיים של מסמכים ישראליים — מכתבי אישום ועד פרוטוקולים.",
      icon: "FileSearch",
      tags: ["LLM", "עיבוד מסמכים", "AI"],
    },
    {
      title: "הגנת פרטיות ורגולציה",
      subtitle: "הגשר בין הוראות משפטיות לפתרונות טכנולוגיים",
      description: "הנקודה שבה הדין פוגש את הקוד — תרגום דרישות חוק הגנת הפרטיות הישראלי וה-GDPR לאפיון טכני ממשי: ארכיטקטורת מידע, מדיניות גישה ומנגנוני מחיקה. היכולת לקרוא גם את החקיקה וגם את הקוד מאפשרת לתת ייעוץ שאינו נעצר בהמלצה המשפטית, אלא מתרגם אותה ליישום שעובד — וזה בדיוק החיבור שבין משפט, מידע וטכנולוגיה.",
      icon: "Scale",
      tags: ["הגנת פרטיות", "GDPR", "חוק × קוד"],
    },
  ],
  extensions: {
    title: "הוספת יכולות מתקדמות במערכות מידע קיימות",
    subtitle: "תוספים וכלים שרוכבים על גבי הפלטפורמות שאתם כבר עובדים איתן",
    // Right after the first service card (ויזואליזציה של תיק משפטי).
    position: 1,
    paragraphs: [
      "במקביל לפיתוח מערכות עצמאיות, אני מפתח תוספים וכלים שרוכבים על גבי אתרים ופלטפורמות קיימות לצורך שיפור היכולות והשימושיות. הגישה הזו מבוססת על תפיסה אחת פשוטה: עורך הדין כבר עובד מול מערכות מסוימות — נט המשפט, יומני Google ו-Outlook, פורטלים של רשויות — והשינוי המשמעותי ביותר מתקבל לא מהחלפת המערכת, אלא מהוספת שכבה חכמה מעליה.",
      "התוצאה היא חיסכון מיידי בזמן, ביטול של עבודה ידנית חוזרת, וחילוץ מידע שעד עכשיו היה נעול בתוך ממשק לא נגיש. כל זאת מבלי לשנות הרגלי עבודה של עורכי הדין במשרד, ומבלי להכניס את המשרד לפרויקט הטמעה ארוך וכבד.",
    ],
    items: [
      {
        title: "סנכרון יומן על בסיס דיוני נט המשפט",
        subtitle: "תוסף דפדפן · Net HaMishpat → Google / Outlook",
        description: "תוסף שמזהה את הדיונים העתידיים הקבועים בנט המשפט עבור עורך הדין, מחלץ את כל פרטי הדיון — תיק, ערכאה, אולם, מועד ושעה — ומסנכרן אותם אוטומטית ליומן Google או Outlook של המשרד. כל עדכון בנט המשפט (דחייה, החלפת אולם, שינוי שעה) מתעדכן ביומן בלי שאף אחד צריך להזין שוב את הפרטים בידיים.",
        icon: "Calendar",
        tags: ["נט המשפט", "סנכרון יומן", "אוטומציה"],
        screenshotUrl: "",
        screenshotAlt: "צילום מסך: סנכרון יומן נט המשפט",
      },
      {
        title: "הורדה וייצוא של נתוני דיונים",
        subtitle: "ייצוא רשימת דיונים לאקסל / לפלטפורמת ניהול",
        description: "כלי שמאפשר להוריד מנט המשפט את רשימת הדיונים הקבועים — של עורך דין בודד, של מחלקה או של כל המשרד — בפורמט שניתן לעבד (Excel, CSV או JSON), או לשלוח אותם ישירות לפלטפורמת ניהול תיקים נבחרת באמצעות API. במקום להעתיק ידנית שורות מטבלאות באתר, מקבלים קובץ מובנה שמוכן לעבודה.",
        icon: "Download",
        tags: ["ייצוא נתונים", "אקסל", "API"],
        screenshotUrl: "",
        screenshotAlt: "צילום מסך: ייצוא רשימת דיונים",
      },
      {
        title: "הורדת מסמכים מרובים ברשימת מסמכים",
        subtitle: "Bulk Download — בקשות, החלטות, פרוטוקולים ותיק נייר",
        description: "תוסף שמוסיף בכל רשימת מסמכים בנט המשפט — בקשות, החלטות, פרוטוקולים, תיק נייר וכדומה — אפשרות לסמן מרובה ולהוריד את כל הקבצים בלחיצה אחת, עם שמות קבצים ותיקיות שמסודרים אוטומטית לפי מספר התיק, סוג המסמך ותאריך. מבטל את הצורך בלחיצה על כל מסמך בנפרד ובהורדה ידנית של עשרות קבצים בכל פעם שצריך לעבוד עם תיק.",
        icon: "FileDown",
        tags: ["הורדה מרובה", "ניהול מסמכים", "נט המשפט"],
        screenshotUrl: "",
        screenshotAlt: "צילום מסך: הורדה מרובה של מסמכים",
      },
    ],
  },
  credentials: {
    title: "הסמכות ורקע מקצועי",
    items: [
      "ממונה הגנת פרטיות מוסמך — אוניברסיטת תל אביב, בחסות הרשות להגנת הפרטיות",
      "ראש צוות דאטה ואנליסט — סטארטאפ בתחום האלגוריתמיקה של סאונד",
      "מוביל מיזמי Civic Tech — מידע לעם, יומן לעם, ניגוד עניינים לעם",
    ],
  },
  careerTimeline: {
    title: "המסלול המקצועי",
    subtitle: "תחנות מרכזיות שעיצבו את הדרך בה אני מחבר בין משפט, דאטה וטכנולוגיה",
    entries: [
      {
        period: "2016–2017",
        role: "מטפל בקשות חופש מידע",
        organization: "היחידה הממשלתית לחופש המידע, משרד המשפטים",
        description:
          "מעבר מבפנים על מנגנון יישום חוק חופש המידע במשרדי הממשלה — היכרות עם ההיגיון של הרשות והדפוסים שעובדים מולה.",
      },
      {
        period: "2018–2019",
        role: "אנליסט מחקר",
        organization: "התנועה לחופש המידע",
        description:
          "ניתוח רגולציה ובקשות, ליווי תיקים אסטרטגיים — ראיית הצד השני של המתרס מול הרשות.",
      },
      {
        period: "2018–2020",
        role: "אנליסט וראש צוות דאטה",
        organization: 'בוגאטון (Bugatone) — סטארטאפ אלגוריתמיקת סאונד',
        description:
          "הקמת תשתית דאטה, מודלים סטטיסטיים ופייפליינים לעיבוד אותות. בית הספר שלי להנדסת תוכנה ולחשיבה בכלים.",
      },
      {
        period: "2021–2022",
        role: "ייעוץ עצמאי בדאטה ומחקר משפטי",
        organization: "פרילנס",
        description:
          "ניתוח נתונים ומחקרים משפטיים-כמותיים עבור משרדי עו״ד, ארגונים אקדמיים וגופי חברה אזרחית.",
      },
      {
        period: "2023–היום",
        role: "עורך דין פלילי",
        organization: "ייצוג בהליכים פליליים ובעתירות חופש מידע",
        description:
          "עיסוק משפטי במשרה מלאה במקביל למיזמי Civic Tech (מידע לעם, יומן לעם, ניגוד עניינים לעם).",
      },
    ],
  },
  cta: {
    title: "מעוניינים בטרנספורמציה דיגיטלית?",
    description: "אשמח לשמוע על האתגרים הטכנולוגיים של המשרד או העסק שלכם ולהציע פתרונות מותאמים.",
    ctaText: "צרו קשר",
    ctaLink: "/contact",
  },
};

/* ─── Sanegoria Dashboard Page ─── */

export const DEFAULT_SANEGORIA_CONTENT: SanegoriaPageContent = {
  isPublic: true,
  hero: {
    title: "ניתוח ייצוג סניגוריה ציבורית",
    subtitle: "הליכים פליליים בישראל — 2022 ואילך",
  },
  disclaimer: {
    paragraphs: [
      "שיוך העבירות מבוסס על נתוני תביעות משטרה בלבד (ללא פרקליטות) לשנים 2022–2025.",
      "הנתונים והעיבודים בוצעו במאמץ לשקף את המציאות בצורה מדויקת, אולם ייתכנו טעויות ואי-דיוקים, בין היתר לאור הצורך באינטגרציה של מקורות מידע שונים ללא שדות אחידים.",
      "חשוב לציין כי הפער בין תיקים בייצוג סניגוריה ציבורית לבין תיקים שלא בייצוג עשוי לנבוע לא רק מאופי הטיפול ודינמיקת ההליך, אלא גם — ואולי בעיקר — מעצם הניתוב והבחירה בייצוג סניגוריה על בסיס מאפייני התיק והנאשם. לפיכך, ההבדלים המוצגים אינם בהכרח משקפים שוני באופן הטיפול, אלא עשויים לשקף הבדלים מובנים בסוגי התיקים המנותבים לכל ערוץ ייצוג.",
    ],
  },
};

/* ─── Class Actions Dashboard Page ─── */

export const DEFAULT_CLASS_ACTIONS_CONTENT: ClassActionsPageContent = {
  isPublic: true,
  hero: {
    title: "תובענות ייצוגיות — תובענות אחרונות",
    subtitle: "רשימת התובענות הייצוגיות החדשות שנפתחו בפנקס",
  },
  cacheTtlMinutes: 60,
  legislation: [
    {
      label: 'חוק תובענות ייצוגיות, התשס"ו–2006',
      url: "https://he.wikisource.org/wiki/חוק_תובענות_ייצוגיות",
      kind: "law",
    },
  ],
  // Empty base filter = current behaviour (show everything). The admin can
  // restrict the document set via customQuery; the dashboard's own filters
  // layer on top.
  query: {
    customQuery: null,
    displayFields: [],
    filterFields: [],
    sortFields: [],
  },
};

/* ─── Guidelines Dashboard Page ─── */

export const DEFAULT_GUIDELINES_CONTENT: GuidelinesPageContent = {
  isPublic: true,
  hero: {
    title: "הנחיות",
    subtitle: 'מאגר מאוחד של הנחיות יועמ"ש, פרקליט המדינה, משטרה ועוד — חיפוש בתוך הטקסט',
  },
  cacheTtlMinutes: 60,
  query: {
    customQuery: null,
    displayFields: [],
    filterFields: [],
    sortFields: [],
  },
};

/* ─── Comptroller Reports Page (TAG-IT scope 13) ─── */

export const DEFAULT_COMPTROLLER_REPORTS_CONTENT: ComptrollerReportsPageContent = {
  // Kept private until TAG-IT exposes scope 13 on the public API; flip to true
  // (or set isPublic in the DB Page row) once data flows. Admins can preview it
  // regardless via the auth gate in the page.
  isPublic: false,
  hero: {
    title: "דוחות מבקר המדינה",
    subtitle: "מאגר דוחות מבקר המדינה — חיפוש חופשי בתוך תוכן הדוחות",
  },
  cacheTtlMinutes: 60,
  query: {
    customQuery: null,
    displayFields: [],
    filterFields: [],
    sortFields: [],
  },
};

/* ─── Knesset Research Center (מ.מ.מ) Page (TAG-IT scope 14) ─── */

export const DEFAULT_MMM_CONTENT: MmmPageContent = {
  // Kept private until TAG-IT exposes scope 14 on the public API; flip to true
  // (or set isPublic in the DB Page row) once data flows. Admins can preview it
  // regardless via the auth gate in the page.
  isPublic: false,
  hero: {
    title: "מסמכי מרכז המחקר והמידע של הכנסת",
    subtitle: "מאגר מסמכי המ.מ.מ — חיפוש חופשי בתוך תוכן המסמכים",
  },
  cacheTtlMinutes: 60,
  query: {
    customQuery: null,
    displayFields: [],
    filterFields: [],
    sortFields: [],
  },
};

/* ─── Defamation Rulings Dashboard Page ─── */

export const DEFAULT_DEFAMATION_RULINGS_CONTENT: DefamationRulingsPageContent = {
  isPublic: false,
  hero: {
    title: "פסקי דין בלשון הרע",
    subtitle: "פסקי דין אחרונים בעניין לשון הרע",
  },
  cacheTtlMinutes: 60,
  legislation: [
    {
      label: 'חוק איסור לשון הרע, התשכ"ה–1965',
      url: "https://he.wikisource.org/wiki/חוק_איסור_לשון_הרע",
      kind: "law",
    },
  ],
  allowedDocTypes: ["פסק דין"],
  query: {
    customQuery: null,
    // Header = case name, then summary, then metadata + the compensation
    // amount awarded (when one was — ~3/4 of judgments).
    displayFields: [
      "ai.שם_התיק",
      "ai.תקציר",
      "ai.בית_משפט",
      "meta.document_date",
      "ai.שופטים",
      "sql.היבטים_פיננסיים.סכום_פיצוי_נפסק",
      // Publications list (shown above the defenses): per publication —
      // platform, ruled-defamatory flag, defenses-applied flag, description.
      "sql.רשימת_פרסומים",
      // Array-of-objects "table inside the case": each defense claimed, with
      // its acceptance status, clause, and the court's short reasoning.
      "sql.הגנות_שנטענו",
    ],
    filterFields: [
      { key: "ai.שם_התיק", label: "חיפוש בשם התיק", control: "text" },
      { key: "ai.בית_משפט", label: "בית משפט", control: "select" },
      { key: "meta.document_date", label: "תאריך", control: "date" },
      // Awarded-compensation range (₪). Nested numeric field — TAG-IT filters
      // it with ge/le. Values are full shekel amounts (e.g. 47000, 250000).
      {
        key: "sql.היבטים_פיננסיים.סכום_פיצוי_נפסק",
        label: "סכום פיצוי שנפסק (₪)",
        control: "number",
      },
      // Free-text search inside the publications of each case. Uses the
      // scalar sql.תיאור_הפרסום — the array path sql.רשימת_פרסומים is not
      // filterable upstream (TAG-IT returns 0).
      { key: "sql.תיאור_הפרסום", label: "חיפוש בפרסומים", control: "text" },
      { key: "sql.פלטפורמה", label: "פלטפורמה", control: "text" },
      // Boolean (כן/לא) filters over scalar case-level flags.
      { key: "sql.נקבע_כלשון_הרע", label: "נקבע כלשון הרע", control: "boolean" },
      { key: "sql.מטרה_לפגוע.קביעה_על_מטרה_לפגוע", label: "כוונה לפגוע", control: "boolean" },
      { key: "sql.חלו_הגנות", label: "חלו הגנות", control: "boolean" },
      // Per-defense search. TAG-IT filters array elements with "any element"
      // semantics, so name + status combined finds cases where a specific
      // defense was accepted/rejected.
      { key: "sql.הגנות_שנטענו.שם_ההגנה", label: "שם הגנה", control: "text" },
      {
        key: "sql.הגנות_שנטענו.התקבלה",
        label: "סטטוס הגנה",
        control: "select",
        options: ["כן", "לא", "חלקית", "לא נדונה"],
      },
    ],
    sortFields: [],
    scope: 4,
    pageSize: 24,
  },
};

/* ─── FOI Petitions Rulings Dashboard Page ─── */

// Shared across the FOI pages: the primary law + its main regulations.
const FOI_LEGISLATION = [
  {
    label: 'חוק חופש המידע, התשנ"ח–1998',
    url: "https://he.wikisource.org/wiki/חוק_חופש_המידע",
    kind: "law" as const,
  },
  {
    label: 'תקנות חופש המידע, התשנ"ט–1999',
    url: "https://he.wikisource.org/wiki/תקנות_חופש_המידע",
    kind: "regulation" as const,
  },
  {
    label: 'תקנות חופש המידע (אגרות), התשנ"ט–1999',
    url: "https://he.wikisource.org/wiki/תקנות_חופש_המידע_(אגרות)",
    kind: "regulation" as const,
  },
];

export const DEFAULT_FOI_RULINGS_CONTENT: FoiRulingsPageContent = {
  isPublic: false,
  hero: {
    title: "פסקי דין בעתירות חופש מידע",
    subtitle: "פסקי דין אחרונים בעתירות לפי חוק חופש המידע",
  },
  cacheTtlMinutes: 60,
  legislation: FOI_LEGISLATION,
  allowedDocTypes: ["פסק דין"],
  query: { customQuery: null, displayFields: [], filterFields: [], sortFields: [], scope: 6, pageSize: 24 },
};

/* ─── FOI Judgments Page (פסיקות חופש מידע) ───
   Successor to foi-rulings. Identical filter (only פס"ד) but distinct
   slug + title. The /foi-rulings URL redirects here. */

export const DEFAULT_FOI_JUDGMENTS_CONTENT: FoiJudgmentsPageContent = {
  isPublic: false,
  hero: {
    title: "פסיקות חופש מידע",
    subtitle: "פסקי דין בעתירות לפי חוק חופש המידע, מהחדש לישן",
  },
  cacheTtlMinutes: 60,
  legislation: FOI_LEGISLATION,
  allowedDocTypes: ["פסק דין", 'פס"ד'],
  query: { customQuery: null, displayFields: [], filterFields: [], sortFields: [], scope: 6, pageSize: 24 },
};

/* ─── FOI Costs Page (הוצאות חופש מידע) ───
   Scope 6 documents where the SQL-extracted court-costs field has a
   numeric value. The exact field key may need adjustment after the
   admin checks the schema; the default below is a best guess. */

export const DEFAULT_FOI_COSTS_CONTENT: FoiCostsPageContent = {
  isPublic: false,
  hero: {
    title: "הוצאות חופש מידע",
    subtitle: "פסיקות שבהן נפסקו הוצאות משפט, מהחדש לישן",
  },
  cacheTtlMinutes: 60,
  legislation: FOI_LEGISLATION,
  // Don't constrain by title — the cost filter does the heavy lifting.
  allowedDocTypes: [],
  query: {
    // Field name confirmed against TAG-IT's schema:
    //   sql.סכום_הוצאות_שקלים  (note: שקלים, not בשקלים)
    customQuery: {
      field: "sql.סכום_הוצאות_שקלים",
      op: "not_null",
    },
    // Surface the cost amount prominently in each card. Field keys verified
    // against an actual TAG-IT response — the document date lives under
    // meta.document_date (not ai.תאריך_המסמך, which doesn't exist).
    displayFields: [
      "ai.שם_התיק",
      "ai.בית_משפט",
      "meta.document_date",
      "ai.שופטים",
      "ai.כותרת_המסמך",
      "sql.סכום_הוצאות_שקלים",
    ],
    // User-facing filter controls on the public page.
    filterFields: [
      { key: "ai.שם_התיק", label: "חיפוש בשם התיק", control: "text" },
      { key: "ai.בית_משפט", label: "בית משפט", control: "select" },
      { key: "sql.סכום_הוצאות_שקלים", label: "סכום הוצאות (₪)", control: "number" },
      { key: "meta.document_date", label: "תאריך המסמך", control: "date" },
    ],
    // User-facing sort options. First entry is the default sort.
    sortFields: [
      { key: "meta.document_date", label: "תאריך המסמך" },
      { key: "sql.סכום_הוצאות_שקלים", label: "סכום הוצאות" },
    ],
    scope: 6,
    pageSize: 24,
  },
};

/* ─── Drug-Sentencing Rulings Page (גזרי דין בעבירות סמים) ───
   TAG-IT scope 1 (criminal sentencing), base-filtered to drug cases. The real
   display/filter config lives in the prod DB Page row — this is just the
   first-deploy fallback. */

export const DEFAULT_DRUG_SENTENCING_CONTENT: DrugSentencingPageContent = {
  isPublic: false,
  hero: {
    title: "גזרי דין בעבירות סמים",
    subtitle: "גזרי דין אחרונים בעבירות סמים — נאשמים, הרשעות, ענישה וסוגי הסמים",
  },
  cacheTtlMinutes: 60,
  legislation: [
    {
      label: "פקודת הסמים המסוכנים [נוסח חדש], התשל\"ג–1973",
      url: "https://he.wikisource.org/wiki/פקודת_הסמים_המסוכנים",
      kind: "law" as const,
    },
  ],
  allowedDocTypes: [],
  query: {
    // null so the DB row's customQuery is taken WHOLESALE by deepMerge — a
    // non-null leaf default here corrupts an AND-tree DB customQuery (deepMerge
    // would mix this leaf's field/value into the and-node). The live base
    // filter lives in the DB Page row (scripts/drug-sentencing-config.ts).
    customQuery: null,
    displayFields: [],
    filterFields: [],
    sortFields: [],
    scope: 1,
    pageSize: 24,
  },
};

/* ─── Conditional Arrangements Dashboard Page ─── */

export const DEFAULT_CONDITIONAL_ARRANGEMENTS_CONTENT: ConditionalArrangementsPageContent = {
  isPublic: true,
  hero: {
    title: "הסדרים מותנים",
    subtitle: "מאגר הסדרים מותנים של המשטרה והפרקליטות — מהחדש לישן",
  },
  cacheTtlMinutes: 60,
};

/* ─── Leam (לעם) Civic Sites Page ─── */

export const DEFAULT_LEAM_CONTENT: LeamPageContent = {
  metaStrip: "טכנולוגיה אזרחית · גרסה 1.0",
  hero: {
    title: "לעם",
    subtitle:
      "מקבץ של ארבעה אתרים אזרחיים שמנגישים מידע ציבורי בישראל — מאגרי מידע, גרסאות, יומני נבחרים והסדרי ניגוד עניינים.",
  },
  stats: [
    { k: "04", v: "אתרים" },
    { k: "49+", v: "גופים ציבוריים" },
    { k: "∞", v: "מאגרי מידע", srK: "ללא הגבלה" },
    { k: "100%", v: "קוד פתוח" },
  ],
  manifesto: {
    title: "שקיפות היא תנאי לדמוקרטיה",
    body:
      "ארבעת האתרים שלהלן נבנו מתוך תפיסה אחת: שמידע ציבורי הוא קודם כל שלנו. כל אתר מטפל בשכבה אחרת של הפער בין המידע שגופי הציבור מחזיקים לבין המידע שאזרחים יכולים בפועל להגיע אליו, להבין ולהשתמש בו — מהקובץ הגולמי ועד מפת הקשרים בין נושאי המשרה.",
  },
  sitesSection: {
    eyebrow: "האתרים",
    title: "ארבע שכבות של שקיפות",
  },
  sites: [
    {
      index: "01",
      name: "מידע לעם",
      tagline: "אתר המידע הפתוח הישראלי",
      description:
        "מערכת שמרכזת אלפי מאגרי מידע מ-49 גופים ציבוריים בישראל ומאפשרת לכל אזרח לחפש, לעיין ולהוריד מידע ממשלתי — מהיסטוריית טיסות ועד רישומי בנייה ירוקה. הבסיס לכל ניתוח ציבורי בלתי-תלוי.",
      domain: "odata.org.il",
      url: "https://www.odata.org.il/",
      icon: "Database",
      tags: ["מידע פתוח", "ממשק תכנות פתוח", "49 גופים"],
    },
    {
      index: "02",
      name: "גרסאות לעם",
      tagline: "מעקב גרסאות אחרי מאגרי מידע ממשלתיים",
      description:
        "כלי שמתעד את ההיסטוריה של מאגרי המידע ב-data.gov.il וב-gov.il — כל הוספה, גריעה או שינוי של קובץ. מאפשר לעקוב, להשוות בין גרסאות ולזהות שינויים שקטים בנתונים שמתפרסמים לציבור. שקיפות גם לאורך זמן, לא רק ברגע הפרסום.",
      domain: "over.org.il",
      url: "https://www.over.org.il/",
      icon: "History",
      tags: ["השוואת גרסאות", "מאגרים ממשלתיים", "שקיפות לאורך זמן"],
    },
    {
      index: "03",
      name: "יומן לעם",
      tagline: "מעקב אחר פעילות נבחרי ציבור",
      description:
        "כלי שמתעד ומנגיש את יומני הפעילות של נבחרי ציבור בישראל — ישיבות, הצבעות ופעילות שוטפת — ומקשר בין דמויות ציבוריות לבין ציר הזמן. נציגים שנבחרו לשרת את הציבור צריכים להיות אחראים כלפיו.",
      domain: "ocal.org.il",
      url: "https://ocal.org.il/",
      icon: "Calendar",
      tags: ["נבחרי ציבור", "ציר זמן", "אחריותיות"],
    },
    {
      index: "04",
      name: "ניגוד עניינים לעם",
      tagline: "מאגר הסדרי ניגוד עניינים של נושאי משרה",
      description:
        "מנוע חיפוש שמרכז את הסדרי ניגוד העניינים של בעלי תפקידים ציבוריים בישראל ומאפשר לבדוק אילו זיקות כלכליות ועסקיות קיימות להם — וגם למפות חזותית את רשת הקשרים שביניהם.",
      domain: "ocoi.org.il",
      url: "https://www.ocoi.org.il/",
      icon: "Network",
      tags: ["גרף קשרים", "ניגוד עניינים", "מיפוי קשרים"],
    },
  ],
  ctaSiteLabel: "כניסה לאתר",
  cta: {
    title: "רוצים לשתף פעולה?",
    description:
      "אתרי לעם פתוחים לשיתופי פעולה עם חוקרים, עיתונאים, ארגוני חברה אזרחית ויוצרים עצמאיים. אם יש לכם רעיון להמשך — כתבו לנו.",
    primaryCtaText: "צרו קשר",
    primaryCtaLink: "/contact",
    secondaryCtaText: "כל המיזמים",
    secondaryCtaLink: "/projects",
  },
};

/* ─── Letz (לץ) Browser-Extensions Page ─── */

export const DEFAULT_LETZ_CONTENT: LetzPageContent = {
  metaStrip: "תוספי דפדפן · שקיפות בלחיצה",
  hero: {
    title: "לץ",
    subtitle:
      "סדרת תוספי דפדפן שהופכים מאגרי מידע ומסמכים ציבוריים לקבצים מסודרים — בלחיצה אחת, מקומית בדפדפן וללא שרת ביניים.",
  },
  stats: [
    { k: "03", v: "תוספים" },
    { k: "∞", v: "קבצים להורדה", srK: "ללא הגבלה" },
    { k: "100%", v: "מקומי בדפדפן" },
    { k: "0", v: "שרתי ביניים" },
  ],
  manifesto: {
    title: "המידע הציבורי הוא שלכם — קחו אותו",
    body:
      "שלושת התוספים שלהלן נבנו מתוך תפיסה אחת: שכל אחד צריך להיות מסוגל להוריד מידע ומסמכים ציבוריים בכוחות עצמו, בלי לדעת לתכנת ובלי שרת ביניים שמתווך בין המשתמש לבין הנתונים. כל תוסף מזהה את המידע הפתוח שמסתתר מאחורי ממשק מסורבל, ומגיש אותו בלחיצה כקובץ מסודר שאפשר לעבוד איתו.",
  },
  sitesSection: {
    eyebrow: "התוספים",
    title: "שלושה תוספים, מטרה אחת",
  },
  sites: [
    {
      index: "01",
      name: "לץ המשפט",
      tagline: "מוריד מסמכים מנט המשפט",
      description:
        "תוסף Chrome לעורכי דין, מתמחים ובעלי דין: מזהה תיק בנט המשפט ומוריד את כל מסמכיו כ-ZIP עם אינדקס CSV, וכן רשימות דיונים. הכול מקומי בדפדפן — הקבצים נשמרים אצל המשתמש, ללא שרת ביניים.",
      domain: "z-g.co.il/court-downloader",
      url: "/court-downloader",
      icon: "Scale",
      tags: ["נט המשפט", "מסמכים", "הורדה מקומית"],
    },
    {
      index: "02",
      name: "לץ הממשל",
      tagline: "מוריד מאגרי נתונים מאתרי ממשלה",
      description:
        "תוסף Chrome שמזהה מאגרי נתונים פתוחים באתרי ממשלה ישראליים (gov.il, נדל״ן, GovMap, מנהל התכנון ועוד) ומאפשר להוריד אותם בלחיצה כ-CSV/GeoJSON/ZIP. חלק ממיזם השקיפות של גרסאות לעם (OVER).",
      domain: "z-g.co.il/govscraper",
      url: "/govscraper",
      icon: "Globe",
      tags: ["מאגרי ממשלה", "GovMap", "מידע פתוח"],
    },
    {
      index: "03",
      name: "לץ הלמ״ס",
      tagline: "מוריד נתונים מהלשכה המרכזית לסטטיסטיקה",
      description:
        "תוסף לאיסוף וניתוח נתונים מאתר הלשכה המרכזית לסטטיסטיקה (הלמ״ס). מחובר לשרת של גרסאות לעם (OVER) — ניגש דרכו לאינדקס המאגרים ומריץ מולו שאילתות.",
      domain: "z-g.co.il/data-pipeline",
      url: "/data-pipeline?series=letz",
      icon: "BarChart3",
      tags: ["למ״ס", "סטטיסטיקה", "שאילתות"],
    },
  ],
  ctaSiteLabel: "לתוסף",
  cta: {
    title: "רוצים תוסף לאתר שחשוב לכם?",
    description:
      "סדרת לץ נבנית בקוד פתוח ומתרחבת. אם יש אתר ממשלתי או ציבורי שממנו אתם צריכים להוריד מידע — כתבו לי ואבדוק אם אפשר להוסיף לו תוסף.",
    primaryCtaText: "צרו קשר",
    primaryCtaLink: "/contact",
    secondaryCtaText: "כל המיזמים",
    secondaryCtaLink: "/projects",
  },
};

/* ─── Data Pipeline Map Page (זרימת המידע) ─── */

// Per-node text defaults are derived from the structural node list so there's
// a single source of truth; the admin can override any of them via the CMS.
export const DEFAULT_DATA_PIPELINE_CONTENT: DataPipelinePageContent = {
  isPublic: true,
  hero: {
    title: "זרימת המידע",
    subtitle:
      "מאחורי כל דשבורד ציבורי עומדת שרשרת של פרויקטים: סקרייפרים שאוספים מידע גולמי, מערכות שמנהלות ומתעדות אותו, ואתרים שהופכים אותו לכלי נגיש לציבור. כך זה מתחבר.",
  },
  nodes: Object.fromEntries(
    PIPELINE_NODES.map((n) => [
      n.id,
      { name: n.name, tagline: n.tagline, description: n.description },
    ]),
  ),
};

/* ─── Defaults Map ─── */

export const CONTENT_DEFAULTS: Record<string, unknown> = {
  home: DEFAULT_HOME_CONTENT,
  about: DEFAULT_ABOUT_CONTENT,
  contact: DEFAULT_CONTACT_CONTENT,
  header: DEFAULT_HEADER_CONTENT,
  footer: DEFAULT_FOOTER_CONTENT,
  services: DEFAULT_SERVICES_CONTENT,
  articles: DEFAULT_ARTICLES_CONTENT,
  haplilist: DEFAULT_HAPLILIST_CONTENT,
  media: DEFAULT_MEDIA_CONTENT,
  "article-detail": DEFAULT_ARTICLE_DETAIL_CONTENT,
  "service-detail": DEFAULT_SERVICE_DETAIL_CONTENT,
  projects: DEFAULT_PROJECTS_CONTENT,
  "digital-services": DEFAULT_DIGITAL_SERVICES_CONTENT,
  sanegoria: DEFAULT_SANEGORIA_CONTENT,
  "class-actions": DEFAULT_CLASS_ACTIONS_CONTENT,
  guidelines: DEFAULT_GUIDELINES_CONTENT,
  "comptroller-reports": DEFAULT_COMPTROLLER_REPORTS_CONTENT,
  mmm: DEFAULT_MMM_CONTENT,
  "defamation-rulings": DEFAULT_DEFAMATION_RULINGS_CONTENT,
  "foi-rulings": DEFAULT_FOI_RULINGS_CONTENT,
  "foi-judgments": DEFAULT_FOI_JUDGMENTS_CONTENT,
  "foi-costs": DEFAULT_FOI_COSTS_CONTENT,
  "drug-sentencing": DEFAULT_DRUG_SENTENCING_CONTENT,
  "conditional-arrangements": DEFAULT_CONDITIONAL_ARRANGEMENTS_CONTENT,
  leam: DEFAULT_LEAM_CONTENT,
  letz: DEFAULT_LETZ_CONTENT,
  "data-pipeline": DEFAULT_DATA_PIPELINE_CONTENT,
};
