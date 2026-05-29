import type {
  HomePageContent,
  AboutPageContent,
  ContactPageContent,
  HeaderContent,
  FooterContent,
  ServicesPageContent,
  ArticlesPageContent,
  MediaPageContent,
  ArticleDetailContent,
  ServiceDetailContent,
  ProjectsPageContent,
  DigitalServicesPageContent,
  SanegoriaPageContent,
  ClassActionsPageContent,
  GuidelinesPageContent,
  DefamationRulingsPageContent,
  FoiRulingsPageContent,
  ConditionalArrangementsPageContent,
  LeamPageContent,
} from "@/types/content";

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
    { label: "פרסומים", href: "/media" },
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
      title: "פח המשפט",
      subtitle: "סטטוס נט המשפט בזמן אמת — דיווחים קהילתיים",
      description: "פלטפורמה קהילתית שעוקבת אחרי הזמינות של נט המשפט. כל משתמש יכול לדווח על תקלה (מערכת קרסה / תקלה חלקית) או לאשר שהמערכת חזרה לתקנה, וכולם רואים את הסטטוס הנוכחי. בנוסף — הודעות מערכת ועדכוני מנהל, יומן דיווחים ותגובות קהילה.",
      url: "/pach-hamishpat",
      icon: "Trash2",
      tags: ["נט המשפט", "דיווח קהילתי", "סטטוס בזמן אמת"],
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
      title: "ניהול קשרים מול גורמי אכיפה",
      subtitle: "CRM משפטי מותאם",
      description: "מערכת מותאמת למעקב אחר תכתובות, מועדים והתכתבויות עם פרקליטות, משטרה ורשויות. ניהול מרכזי של כל נקודות המגע בתיק, כולל התראות אוטומטיות למועדים קריטיים וארכיון חכם של תכתובות.",
      icon: "Database",
      tags: ["CRM", "ניהול תיקים", "אכיפה"],
    },
    {
      title: "ויזואליזציה של תיק משפטי",
      subtitle: "מיפוי חזותי לניתוח אסטרטגי",
      description: "מיפוי חזותי של ראיות, עדים, לוחות זמנים וקשרים בין שחקנים בתיק. הכלי מאפשר לזהות דפוסים, סתירות וחולשות בתיק באופן ויזואלי — ולהציג ממצאים בצורה ברורה בבית המשפט.",
      icon: "Eye",
      tags: ["ויזואליזציה", "ניתוח ראיות", "מיפוי"],
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
  credentials: {
    title: "הסמכות ורקע מקצועי",
    items: [
      "ממונה הגנת פרטיות מוסמך — אוניברסיטת תל אביב, בחסות הרשות להגנת הפרטיות",
      "ראש צוות דאטה ואנליסט — סטארטאפ בתחום האלגוריתמיקה של סאונד",
      "מוביל מיזמי Civic Tech — מידע לעם, יומן לעם, ניגוד עניינים לעם",
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
};

/* ─── Guidelines Dashboard Page ─── */

export const DEFAULT_GUIDELINES_CONTENT: GuidelinesPageContent = {
  isPublic: true,
  hero: {
    title: "הנחיות",
    subtitle: 'מאגר מאוחד של הנחיות יועמ"ש, פרקליט המדינה, משטרה ועוד — חיפוש בתוך הטקסט',
  },
  cacheTtlMinutes: 60,
};

/* ─── Defamation Rulings Dashboard Page ─── */

export const DEFAULT_DEFAMATION_RULINGS_CONTENT: DefamationRulingsPageContent = {
  isPublic: false,
  hero: {
    title: "פסקי דין בלשון הרע",
    subtitle: "פסקי דין אחרונים בעניין לשון הרע",
  },
  cacheTtlMinutes: 60,
};

/* ─── FOI Petitions Rulings Dashboard Page ─── */

export const DEFAULT_FOI_RULINGS_CONTENT: FoiRulingsPageContent = {
  isPublic: false,
  hero: {
    title: "פסקי דין בעתירות חופש מידע",
    subtitle: "פסקי דין אחרונים בעתירות לפי חוק חופש המידע",
  },
  cacheTtlMinutes: 60,
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

/* ─── Defaults Map ─── */

export const CONTENT_DEFAULTS: Record<string, unknown> = {
  home: DEFAULT_HOME_CONTENT,
  about: DEFAULT_ABOUT_CONTENT,
  contact: DEFAULT_CONTACT_CONTENT,
  header: DEFAULT_HEADER_CONTENT,
  footer: DEFAULT_FOOTER_CONTENT,
  services: DEFAULT_SERVICES_CONTENT,
  articles: DEFAULT_ARTICLES_CONTENT,
  media: DEFAULT_MEDIA_CONTENT,
  "article-detail": DEFAULT_ARTICLE_DETAIL_CONTENT,
  "service-detail": DEFAULT_SERVICE_DETAIL_CONTENT,
  projects: DEFAULT_PROJECTS_CONTENT,
  "digital-services": DEFAULT_DIGITAL_SERVICES_CONTENT,
  sanegoria: DEFAULT_SANEGORIA_CONTENT,
  "class-actions": DEFAULT_CLASS_ACTIONS_CONTENT,
  guidelines: DEFAULT_GUIDELINES_CONTENT,
  "defamation-rulings": DEFAULT_DEFAMATION_RULINGS_CONTENT,
  "foi-rulings": DEFAULT_FOI_RULINGS_CONTENT,
  "conditional-arrangements": DEFAULT_CONDITIONAL_ARRANGEMENTS_CONTENT,
  leam: DEFAULT_LEAM_CONTENT,
};
