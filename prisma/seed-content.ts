import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/* ─── All default content (matches current hardcoded site data) ─── */

const HOME_CONTENT = {
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
    subtitle: "המשרד מתמחה במגוון רחב של תחומי משפט ומעניק שירות משפטי מקצועי ומקיף",
    items: [
      { icon: "Scale", title: "דיני חברות ומסחרי", description: "ייעוץ משפטי מקיף לחברות בכל שלבי הפעילות העסקית, כולל הקמה, מיזוגים ורכישות.", href: "/services" },
      { icon: "Building2", title: 'נדל"ן ומקרקעין', description: 'ליווי עסקאות נדל"ן מורכבות, תכנון ובנייה, ורישום זכויות במקרקעין.', href: "/services" },
      { icon: "Gavel", title: "ליטיגציה ויישוב סכסוכים", description: "ייצוג בבתי משפט ובערכאות שיפוטיות בתיקים אזרחיים, מסחריים ומנהליים.", href: "/services" },
      { icon: "FileText", title: "חוזים והסכמים", description: "ניסוח, עריכה ובחינת חוזים מסחריים, הסכמי שיתוף פעולה והסכמי עבודה.", href: "/services" },
      { icon: "Shield", title: "הגנת פרטיות ורגולציה", description: "ייעוץ בתחום הגנת הפרטיות, ציות לרגולציה ודיני הגנת המידע.", href: "/services" },
      { icon: "Briefcase", title: "דיני עבודה", description: "ייצוג מעסיקים ועובדים בכל תחומי דיני העבודה, כולל הסכמים קיבוציים ותביעות.", href: "/services" },
    ],
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
    items: [
      { title: "שינויים בחוק החברות: מה צריך לדעת בשנת 2025", excerpt: "סקירה מקיפה של התיקונים האחרונים בחוק החברות והשפעתם על ניהול חברות בישראל.", date: "15 בינואר 2025", href: "/articles" },
      { title: "זכויות רוכשי דירות: המדריך המלא", excerpt: 'כל מה שצריך לדעת על זכויות הרוכש בעסקת נדל"ן, מהחתימה ועד קבלת המפתח.', date: "3 בפברואר 2025", href: "/articles" },
      { title: "גישור עסקי: חלופה יעילה לליטיגציה", excerpt: "כיצד הליך הגישור יכול לחסוך לעסקים זמן וכסף ביישוב סכסוכים מסחריים.", date: "20 בפברואר 2025", href: "/articles" },
    ],
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

const ABOUT_CONTENT = {
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

const CONTACT_CONTENT = {
  hero: { title: "צור קשר", subtitle: "נשמח לשמוע מכם. מלאו את הטופס או צרו עמנו קשר באחת מהדרכים הבאות ונחזור אליכם בהקדם." },
  form: { title: "השאירו פרטים" },
  contactInfo: { phone: "03-000-0000", phoneHref: "tel:+972-3-000-0000", email: "info@zomer-law.co.il", emailHref: "mailto:info@zomer-law.co.il", address: "רחוב הברזל 30, תל אביב", hours: "א׳-ה׳: 08:30-18:00" },
  consultationNote: { title: "ייעוץ ראשוני", description: "הפגישה הראשונית עם צוות המשרד היא ללא עלות וללא התחייבות. מטרתה להבין את הצרכים שלכם ולבחון כיצד נוכל לסייע." },
};

const HEADER_CONTENT = {
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

const FOOTER_CONTENT = {
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

/* ─── Seed Function ─── */

const PAGES = [
  { slug: "home", title: "דף הבית", content: HOME_CONTENT },
  { slug: "about", title: "אודות", content: ABOUT_CONTENT },
  { slug: "contact", title: "צור קשר", content: CONTACT_CONTENT },
  { slug: "header", title: "כותרת עליונה", content: HEADER_CONTENT },
  { slug: "footer", title: "כותרת תחתונה", content: FOOTER_CONTENT },
];

async function main() {
  console.log("Seeding structured page content...\n");

  for (const page of PAGES) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        content: page.content as any,
        draftContent: page.content as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      create: {
        slug: page.slug,
        title: page.title,
        content: page.content as any,
        draftContent: page.content as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    console.log(`  ✓ ${page.slug} (${page.title})`);
  }

  console.log("\nContent seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
