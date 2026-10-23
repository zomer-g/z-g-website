import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLUG = "supreme-court-url-backslash-fix";
const TITLE =
  "הלוכסן ההפוך: איך תו אחד בשורת הכתובת שבר את שיתוף פסקי הדין של בית המשפט העליון";

const EXCERPT =
  'כל מי שניסה לשתף קישור ישיר לפסק דין מאתר בית המשפט העליון נתקל באותה תקלה — הקישור פשוט לא עבד. הסיבה הייתה תו בודד בשורת הכתובת: לוכסן שמאלי (\\) במקום הלוכסן הרגיל (/). זהו סיפורו של באג קטן עם השפעה גדולה — איך זיהיתי אותו, למה הוא היה גם בעיית אבטחה ולא רק נגישות, ואיך פנייה לגורמי הטכנולוגיה של בית המשפט הובילה לתיקון שמאפשר מאז לכל אחד לשתף קישורים לפסקי דין.';

// Plain-text paragraph helper
const p = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

// Inline code span (used for the slash characters)
const code = (text: string) => ({
  type: "text",
  text,
  marks: [{ type: "code" }],
});
const t = (text: string) => ({ type: "text", text });

const content = {
  type: "doc",
  content: [
    p(
      "לפעמים השיפור הכי גדול עבור הציבור מסתתר מאחורי הפרט הכי קטן. לא רפורמה, לא חקיקה, ולא פסק דין תקדימי — אלא תו בודד בשורת הכתובת של הדפדפן.",
    ),
    p(
      "הסיפור מתחיל באתר בית המשפט העליון. כל מי שניסה לשתף קישור ישיר לפסק דין או למסמך מהאתר נתקל באותה בעיה מוזרה: הקישור פשוט לא עבד. מעתיקים את הכתובת, שולחים אותה — ובצד השני מקבלים שגיאה.",
    ),
    {
      type: "paragraph",
      content: [
        t(
          "ניסיתי להבין למה, והתשובה הייתה קטנה עד כדי אבסורד. האתר בנה את הכתובות למסמכים באמצעות לוכסן שמאלי — הלוכסן ההפוך ",
        ),
        code("\\"),
        t(
          ", זה שמוכר מנתיבי קבצים של ווינדוס — במקום הלוכסן הרגיל ",
        ),
        code("/"),
        t(
          " שהוא הסטנדרט של כל כתובת אינטרנט בעולם. תו אחד, בכיוון הלא נכון, ובגללו כל הקישורים נשברו.",
        ),
      ],
    },
    {
      type: "paragraph",
      content: [
        t(
          'הדרך לוודא שזו אכן הבעיה הייתה פשוטה: לקחתי כתובת "שבורה" מהאתר, הפכתי ידנית את כל הלוכסנים מ-',
        ),
        code("\\"),
        t(" ל-"),
        code("/"),
        t(
          ", והקישור עבד בצורה מושלמת. כלומר, לא היה כאן שום דבר עמוק — רק כיוון של לוכסן.",
        ),
      ],
    },
    p(
      'אבל למה זה בכלל משנה? כי לתקלה ה"קוסמטית" הזאת הייתה תוצאה אמיתית ומזיקה. מכיוון שאי אפשר היה לשתף את הקישורים כמו שהם, נוצר הרגל ציבורי להשתמש במקצרי כתובות (URL shorteners) כדי לשתף פסקי דין. ומקצרי כתובות הם מחלה של ממש: הם מסתירים לאן הקישור באמת מוביל, ומהווים קרקע פורייה להתחזות, לפישינג ולהפניות כוזבות. כשמדובר באתר של בית המשפט העליון — אחד ממוקדי האמון הציבורי החשובים במדינה — זו כבר לא רק בעיית נגישות, אלא בעיית אבטחה. אסור שאתר כזה ידחוף את המשתמשים שלו אל כלים שמזמינים התחזות.',
    ),
    p(
      "אז פניתי לגורמי הטכנולוגיה של בית המשפט. לא בתלונה ולא בדרישה — פשוט הצבעתי על הבאג, צירפתי דוגמה של קישור שעובד מול קישור שבור, והצעתי את התיקון: להחליף את כיוון הלוכסן. ההצעה נבחנה, התקבלה, ושולבה בתוכנית העבודה.",
    ),
    p(
      "מכאן זה היה עניין של סבלנות. עקבתי, שאלתי מה קורה, וקיבלתי הבטחה שהתיקון יושלם בתוך שבועות. וכך היה: כשבעה שבועות אחרי הפנייה הראשונה, שוחררה בלילה גרסה חדשה של האתר. למחרת בבוקר נכנסתי, בדקתי — ופתאום הכתובות היו תקינות. מאותו רגע, כל אחד יכול פשוט להעתיק קישור לפסק דין של בית המשפט העליון ולשלוח אותו. בלי מקצרים, בלי טריקים, בלי סיכון.",
    ),
    p(
      "מה שאני אוהב בסיפור הזה הוא הפער בין גודל הסיבה לגודל התוצאה. השינוי בקוד היה שולי לחלוטין — תו אחד. אבל ההשפעה נוגעת בכל מי שאי פעם רצה לשתף פסק דין של בית המשפט העליון: עורכי דין, עיתונאים, חוקרים, סטודנטים ואזרחים מן השורה.",
    ),
    p(
      "וזו בדיוק הנקודה שבה משפט וטכנולוגיה נפגשים אצלי. לא תמיד צריך מהלך גדול כדי לשפר את הנגישות למידע המשפטי. לפעמים מספיק לשים לב לפרט שכולם התרגלו לחיות איתו, להבין שהוא בעצם באג, ולטרוח לדווח עליו לגורם הנכון. הדברים הקטנים האלה — כשמתקנים אותם — עושים טוב לעולם.",
    ),
  ],
};

async function main() {
  const author =
    (await prisma.user.findUnique({ where: { email: "zomerg@gmail.com" } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" } })) ??
    (await prisma.user.findFirst());

  if (!author) throw new Error("No user found to attribute the post to.");

  const now = new Date();

  const post = await prisma.plilistPost.upsert({
    where: { slug: SLUG },
    update: {
      title: TITLE,
      content,
      excerpt: EXCERPT,
      status: "PUBLISHED",
      publishedAt: now,
      seoDesc: EXCERPT.slice(0, 300),
    },
    create: {
      slug: SLUG,
      title: TITLE,
      content,
      excerpt: EXCERPT,
      status: "PUBLISHED",
      publishedAt: now,
      authorId: author.id,
      seoTitle: TITLE,
      seoDesc: EXCERPT.slice(0, 300),
      tags: [
        "בית המשפט העליון",
        "נגישות מידע משפטי",
        "טכנולוגיה משפטית",
        "אבטחת מידע",
      ],
    },
  });

  console.log("Published plilist post:");
  console.log("  id:     ", post.id);
  console.log("  slug:   ", post.slug);
  console.log("  status: ", post.status);
  console.log("  author: ", author.email);
  console.log("  url:     /haplilist/" + post.slug);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
