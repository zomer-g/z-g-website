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
} from "@/types/content";

/* ─── Default Content (matches current hardcoded site data) ─── */
/* This file is safe to import from both client and server components. */

export const DEFAULT_HOME_CONTENT: HomePageContent = {
  hero: {
    title: "ייצוג משפטי",
    titleAccent: "ברמה הגבוהה ביותר",
    description:
      "עו\"ד זומר מספק ליווי משפטי מקצועי ומקיף לחברות, עסקים ויחידים. עם ניסיון עשיר וגישה אישית, מחויבות מלאה להשגת התוצאות הטובות ביותר עבור כל לקוח.",
    ctaText: "לייעוץ ראשוני",
    ctaLink: "/contact",
    secondaryCtaText: "תחומי העיסוק",
    secondaryCtaLink: "/services",
  },
  services: {
    title: "תחומי העיסוק",
    subtitle:
      "התמחות במגוון רחב של תחומי משפט תוך מתן שירות משפטי מקצועי ומקיף",
  },
  aboutPreview: {
    title: "עורך דין עם חזון",
    paragraphs: [
      "עו\"ד גיא זומר פועל מתוך מחויבות עמוקה למצוינות מקצועית ולשירות אישי, ומלווה חברות מובילות, יזמים ולקוחות פרטיים בכל תחומי המשפט המסחרי והאזרחי.",
      "עם ניסיון של שנים בתחום, גישה מקצועית ויסודית לכל תיק, תוך שמירה על סטנדרטים גבוהים של יושרה ואמינות.",
    ],
    ctaText: "עוד עליי",
    ctaLink: "/about",
  },
  articles: {
    title: "מאמרים ועדכונים",
    subtitle: "מאמרים מקצועיים ועדכונים משפטיים בתחומי העיסוק",
    ctaText: "לכל המאמרים",
  },
  cta: {
    title: "ייעוץ ראשוני ללא התחייבות",
    description: "אשמח לשמוע על הצרכים המשפטיים שלכם ולהציע את הפתרון המתאים ביותר. צרו קשר עוד היום לשיחת ייעוץ ראשונית.",
    ctaText: "צרו קשר עכשיו",
    ctaLink: "/contact",
    phone: "03-000-0000",
    phoneHref: "tel:+972-3-000-0000",
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
};
