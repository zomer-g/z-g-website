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
    { label: "תחומי עיסוק", href: "/services" },
    { label: "מאמרים", href: "/articles" },
    { label: "מדיה", href: "/media" },
    { label: "מיזמים", href: "/projects" },
    { label: "תובענות ייצוגיות", href: "/class-actions" },
    { label: "שירותים דיגיטליים", href: "/digital-services" },
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
    { label: "מדיה", href: "/media" },
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
    title: "מדיה",
    subtitle: "ראיונות, הרצאות והופעות תקשורתיות בנושאים משפטיים אקטואליים.",
  },
  grid: {
    title: "הופעות אחרונות",
    subtitle: "ריכוז ההופעות התקשורתיות, ההרצאות והפרסומים האחרונים",
    emptyState: "הופעות מדיה יתעדכנו בקרוב.",
  },
  typeLabels: {
    video: "וידאו",
    article: "כתבה",
    podcast: "פודקאסט",
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
      title: "מאגר הנחיות",
      subtitle: 'הנחיות יועמ"ש, פרקליט המדינה ועוד — חיפוש מלא בתוכן',
      description: 'מאגר מאוחד של הנחיות והוראות מטעם רשויות אכיפת החוק והמינהל הציבורי בישראל — היועצת המשפטית לממשלה, פרקליט המדינה, המשטרה ועוד. הכלי מאפשר חיפוש מלא בתוכן ההנחיות (בפורמט Markdown) ולא רק בכותרות, סינון לפי מקור, וצפייה ישירה בקובץ ה-PDF המקורי או בטקסט שחולץ ממנו.',
      url: "/guidelines",
      icon: "BookOpen",
      tags: ["הנחיות", "פרקליטות", "יועמ\"ש", "חיפוש מלא"],
    },
    {
      title: "מידע לעם",
      subtitle: "פורטל המידע הפתוח הישראלי",
      description: "פלטפורמה שמנגישה אלפי מאגרי מידע ממשלתיים לציבור. הפרויקט מרכז נתונים מ-49 גופים ציבוריים ומאפשר לכל אזרח לחפש, לעיין ולהוריד מידע ממשלתי — מהיסטוריית טיסות ועד רישומי בנייה ירוקה. שקיפות מידע היא תנאי הכרחי לדמוקרטיה בריאה, והפרויקט הזה מבטיח שהנתונים שלנו באמת שלנו.",
      url: "https://www.odata.org.il/",
      icon: "Database",
      tags: ["מידע פתוח", "שקיפות ממשלתית", "CKAN"],
    },
    {
      title: "יומן לעם",
      subtitle: "מעקב אחר פעילות נבחרי ציבור",
      description: "כלי ציבורי שמאפשר מעקב שוטף אחר יומני הפעילות של נבחרי ציבור בישראל. הפרויקט נולד מתוך תפיסה פשוטה: נציגים שנבחרו לשרת את הציבור צריכים להיות אחראים כלפיו. הפלטפורמה מתעדת ומנגישה מידע על ישיבות, הצבעות ופעילות שוטפת — וכך מחזקת את האחריותיות הדמוקרטית.",
      url: "https://ocal.org.il/",
      icon: "Calendar",
      tags: ["אחריותיות", "נבחרי ציבור", "שקיפות"],
    },
    {
      title: "ניגוד עניינים לעם",
      subtitle: "מאגר הסדרי ניגוד עניינים של נושאי משרה",
      description: "מנוע חיפוש שמרכז ומנגיש את הסדרי ניגוד העניינים של בעלי תפקידים ציבוריים בישראל. הפלטפורמה מאפשרת לכל אזרח לבדוק אילו זיקות כלכליות ועסקיות קיימות לנושאי המשרה שמקבלים עבורו החלטות — ולמפות את רשת הקשרים ביניהם באמצעות כלי ויזואליזציה אינטראקטיבי.",
      url: "https://www.ocoi.org.il/",
      icon: "Search",
      tags: ["ניגוד עניינים", "ויזואליזציה", "מיפוי קשרים"],
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
      subtitle: "ייעוץ GDPR וחוק הגנת הפרטיות",
      description: "ייעוץ ויישום דרישות הגנת הפרטיות — מהטמעת נהלים פנימיים ועד מינוי ממונה הגנת פרטיות חיצוני. התאמה לחוק הגנת הפרטיות הישראלי, ל-GDPR ולדרישות רגולטוריות ספציפיות לענף.",
      icon: "Scale",
      tags: ["הגנת פרטיות", "GDPR", "רגולציה"],
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
};
