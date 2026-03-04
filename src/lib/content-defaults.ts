import type {
  HomePageContent,
  AboutPageContent,
  ContactPageContent,
  HeaderContent,
  FooterContent,
} from "@/types/content";

/* ─── Default Content (matches current hardcoded site data) ─── */
/* This file is safe to import from both client and server components. */

export const DEFAULT_HOME_CONTENT: HomePageContent = {
  hero: {
    title: "ייצוג משפטי",
    titleAccent: "ברמה הגבוהה ביותר",
    description:
      "משרד עורכי דין זומר מספק ליווי משפטי מקצועי ומקיף לחברות, עסקים ויחידים. עם ניסיון עשיר וגישה אישית, אנו מחויבים להשגת התוצאות הטובות ביותר עבור לקוחותינו.",
    ctaText: "לייעוץ ראשוני",
    ctaLink: "/contact",
    secondaryCtaText: "תחומי העיסוק שלנו",
    secondaryCtaLink: "/services",
  },
  services: {
    title: "תחומי העיסוק שלנו",
    subtitle:
      "המשרד מתמחה במגוון רחב של תחומי משפט ומעניק שירות משפטי מקצועי ומקיף",
  },
  aboutPreview: {
    title: "משרד עורכי דין עם חזון",
    paragraphs: [
      "משרד עורכי דין זומר, בהנהלת עורך הדין גיא זומר, פועל מתוך מחויבות עמוקה למצוינות מקצועית ולשירות אישי. המשרד מלווה חברות מובילות, יזמים ולקוחות פרטיים בכל תחומי המשפט המסחרי והאזרחי.",
      "עם ניסיון של שנים בתחום, המשרד מציע גישה מקצועית ויסודית לכל תיק, תוך שמירה על סטנדרטים גבוהים של יושרה ואמינות.",
    ],
    ctaText: "עוד על המשרד",
    ctaLink: "/about",
  },
  articles: {
    title: "מאמרים ועדכונים",
    subtitle: "מאמרים מקצועיים ועדכונים משפטיים בתחומי העיסוק של המשרד",
    ctaText: "לכל המאמרים",
  },
  cta: {
    title: "ייעוץ ראשוני ללא התחייבות",
    description: "נשמח לשמוע על הצרכים המשפטיים שלכם ולהציע את הפתרון המתאים ביותר. צרו קשר עוד היום לשיחת ייעוץ ראשונית.",
    ctaText: "צרו קשר עכשיו",
    ctaLink: "/contact",
    phone: "03-000-0000",
    phoneHref: "tel:+972-3-000-0000",
  },
};

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  hero: { title: "אודות המשרד", subtitle: "הכירו את משרד עורכי דין זומר - מחויבות למצוינות, מקצועיות ושירות אישי ללקוחותינו." },
  firmStory: {
    title: "הסיפור שלנו",
    subtitle: "מסורת של מצוינות משפטית ושירות אישי",
    paragraphs: [
      "משרד עורכי דין זומר הוקם מתוך חזון להעניק ללקוחותיו שירות משפטי ברמה הגבוהה ביותר, תוך שמירה על גישה אישית וקשובה. מאז הקמתו, המשרד ליווה מאות לקוחות - חברות מובילות, יזמים ולקוחות פרטיים - בתיקים מורכבים ומגוונים.",
      "אנו מאמינים שכל לקוח הוא עולם ומלואו, ולכן אנו מקדישים זמן ומשאבים להבנה מעמיקה של הצרכים הייחודיים של כל מקרה. הגישה שלנו משלבת ידע משפטי רחב עם הבנה עסקית מעשית, ומאפשרת לנו להציע פתרונות יצירתיים ואפקטיביים.",
      'המשרד מתמחה במגוון רחב של תחומי משפט, לרבות דיני חברות ומסחרי, נדל"ן ומקרקעין, ליטיגציה ויישוב סכסוכים, ועוד. אנו מקפידים על עדכון מתמשך בפסיקה ובחקיקה החדשה, ומיישמים את הידע הנרחב שלנו לטובת לקוחותינו.',
      "לאורך השנים, בנינו מוניטין של מקצועיות, אמינות ותוצאות מוכחות. אנו גאים בקשרים ארוכי הטווח שיצרנו עם לקוחותינו, ומחויבים להמשיך ולספק שירות משפטי איכותי ומותאם אישית.",
    ],
  },
  attorney: {
    name: 'עו"ד גיא זומר',
    role: "מייסד ומנהל המשרד",
    bio: [
      'עורך הדין גיא זומר הוא מייסד ומנהל משרד עורכי דין זומר. בעל ניסיון עשיר בתחומי המשפט המסחרי, דיני חברות ונדל"ן.',
      'עו"ד זומר מלווה חברות ויזמים בעסקאות מורכבות, מייעץ בנושאי ממשל תאגידי, ומייצג לקוחות בהליכים משפטיים בכל הערכאות.',
    ],
    credentials: [
      { icon: "GraduationCap", text: "LL.B, הפקולטה למשפטים, אוניברסיטת תל אביב" },
      { icon: "BookOpen", text: "חבר לשכת עורכי הדין בישראל" },
      { icon: "Award", text: "ניסיון מקצועי נרחב בתחומי המשפט המסחרי" },
    ],
  },
  values: {
    title: "הערכים שלנו",
    subtitle: "העקרונות שמנחים אותנו בכל פעולה ובכל ייצוג משפטי",
    items: [
      { icon: "Award", title: "מקצועיות", description: "אנו מקפידים על רמה מקצועית גבוהה בכל תיק ובכל ייעוץ. הצוות שלנו עובר הכשרות מתמשכות ומעדכן את הידע באופן שוטף." },
      { icon: "Heart", title: "מחויבות", description: "מחויבותנו ללקוח היא מוחלטת. אנו מאמינים שכל לקוח ראוי לקבל את מלוא תשומת הלב והמשאבים המקצועיים הנדרשים." },
      { icon: "ShieldCheck", title: "יושרה", description: "אנו פועלים בשקיפות מלאה ובהתאם לסטנדרטים האתיים הגבוהים ביותר. אמינות ויושרה הם עקרונות היסוד של המשרד." },
      { icon: "Lightbulb", title: "חדשנות", description: "אנו מאמצים גישות חדשניות וכלים מתקדמים כדי להעניק ללקוחותינו שירות משפטי יעיל ועדכני בהתאם לעולם המשתנה." },
    ],
  },
  cta: { title: "מוכנים לדבר?", description: "נשמח להכיר אתכם ולשמוע על הצרכים המשפטיים שלכם. פנו אלינו לשיחת ייעוץ ראשונית ללא התחייבות.", ctaText: "צרו קשר", ctaLink: "/contact" },
};

export const DEFAULT_CONTACT_CONTENT: ContactPageContent = {
  hero: { title: "צור קשר", subtitle: "נשמח לשמוע מכם. מלאו את הטופס או צרו עמנו קשר באחת מהדרכים הבאות ונחזור אליכם בהקדם." },
  form: { title: "השאירו פרטים" },
  contactInfo: { phone: "03-000-0000", phoneHref: "tel:+972-3-000-0000", email: "info@zomer-law.co.il", emailHref: "mailto:info@zomer-law.co.il", address: "רחוב הברזל 30, תל אביב", hours: "א׳-ה׳: 08:30-18:00" },
  consultationNote: { title: "ייעוץ ראשוני", description: "הפגישה הראשונית עם צוות המשרד היא ללא עלות וללא התחייבות. מטרתה להבין את הצרכים שלכם ולבחון כיצד נוכל לסייע." },
};

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  logoText: "זומר",
  logoSubtext: "משרד עורכי דין",
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
  firmSubtext: "משרד עורכי דין",
  firmDescription: "משרד עורכי דין זומר מספק ייצוג משפטי מקצועי וליווי עסקי מקיף. המשרד מתמחה במגוון תחומי משפט ומציע שירות אישי ומסור לכל לקוח.",
  quickLinksTitle: "קישורים מהירים",
  quickLinks: [
    { label: "אודות המשרד", href: "/about" },
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
  copyright: "זומר - משרד עורכי דין. כל הזכויות שמורות.",
};

/* ─── Defaults Map ─── */

export const CONTENT_DEFAULTS: Record<string, unknown> = {
  home: DEFAULT_HOME_CONTENT,
  about: DEFAULT_ABOUT_CONTENT,
  contact: DEFAULT_CONTACT_CONTENT,
  header: DEFAULT_HEADER_CONTENT,
  footer: DEFAULT_FOOTER_CONTENT,
};
