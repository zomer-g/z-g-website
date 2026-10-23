/**
 * Creates (or updates) the הפליליסט post "כמה שווה מאגר מידע סגור?".
 *
 * Idempotent: upserts by slug.
 *
 * DATABASE: the repo's local .env still points at the retired Render database.
 * This script refuses to run unless DATABASE_URL points at the live xhostd
 * database, so pass it in through the environment (dotenv never overrides a
 * variable that is already set).
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const LIVE_DB_HOST = "db.xhostd.com";

const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

if (dbHost !== LIVE_DB_HOST) {
  console.error(
    `Refusing to write: DATABASE_URL host is "${dbHost || "(unparseable)"}", expected ${LIVE_DB_HOST}.`,
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* ─────────────────────────────── Sources ─────────────────────────────── */

const SRC = {
  mckinsey:
    "https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/open-data-unlocking-innovation-and-performance-with-liquid-information",
  ec: "https://www.parlament.gv.at/dokument/XXVI/EU/19751/imfname_10805332.pdf",
  guoZhang: "https://doi.org/10.3390/systems14040408",
  denmark: "https://odimpact.org/files/case-study-denmark.pdf",
  jetzek: "https://research-api.cbs.dk/ws/files/58892193/Jetzek.pdf",
  geospatial:
    "https://www.gov.uk/government/publications/measuring-the-economic-social-and-environmental-value-of-public-sector-location-data",
  // The original crcsi.com.au file is gone (CRCSI closed); this is the
  // Internet Archive's capture of the same PDF.
  acil: "https://web.archive.org/web/20180416023832/https://www.crcsi.com.au/assets/Resources/7d60411d-0ab9-45be-8d48-ef8dab5abd4a.pdf",
};

/* ─────────────────────────── TipTap helpers ─────────────────────────── */

type Part = string | { text: string; href: string } | { text: string; bold: true };

const a = (text: string, href: string): Part => ({ text, href });
const b = (text: string): Part => ({ text, bold: true });

function textNode(part: Part) {
  if (typeof part === "string") return { type: "text", text: part };
  if ("href" in part) {
    return {
      type: "text",
      text: part.text,
      marks: [{ type: "link", attrs: { href: part.href, target: "_blank" } }],
    };
  }
  return { type: "text", text: part.text, marks: [{ type: "bold" }] };
}

const p = (...parts: Part[]) => ({ type: "paragraph", content: parts.map(textNode) });

const h2 = (text: string) => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});

const quote = (text: string, attribution: string) => ({
  type: "blockquote",
  content: [p(text), p(`— ${attribution}`)],
});

const ol = (items: Part[][]) => ({
  type: "orderedList",
  content: items.map((parts) => ({ type: "listItem", content: [p(...parts)] })),
});

/* ──────────────────────────────── Post ──────────────────────────────── */

const SLUG = "what-is-a-closed-database-worth";
const TITLE = "כמה שווה מאגר מידע סגור?";
const EXCERPT =
  "על הערך שנוצר כשמידע ממשלתי נפתח לשימוש חופשי, ועל הנזק, שכמעט אף פעם לא נספר, כשהוא נשאר במגירה.";

const content = {
  type: "doc",
  content: [
    p(b(EXCERPT)),

    p(
      `מאגר מידע ממשלתי סגור נראה כמו דבר שלא עולה כסף. הוא קיים, הוא מתוחזק, המשרד משתמש בו לצרכיו, ואם מישהו מבחוץ רוצה חלק ממנו, שיגיש בקשה. הבעיה היא שהחשבון הזה מתעלם מהצד השני של המאזן: מכל מה שלא נבנה, לא נחקר ולא נחסך בגלל שהמידע לא היה זמין. הספרות הכלכלית של העשור וחצי האחרונים עסקה בדיוק בשאלה הזאת, ויש לה מספרים.`,
    ),

    h2("הצד של הערך"),

    p(
      `האומדן המצוטט ביותר הוא של `,
      a("מכון מקינזי הגלובלי", SRC.mckinsey),
      ` משנת 2013. המחקר בחן שבעה תחומים בכלכלה העולמית, מחינוך ותחבורה ועד אנרגיה ובריאות, והעריך שמידע פתוח יכול לאפשר ערך כלכלי נוסף של 3.2 עד 5.4 טריליון דולר בשנה. חשוב לקרוא את המספר נכון: זה עודף כלכלי שנתי, לא ערך מהוון, והוא כולל את מלוא הערך של יוזמות שמידע פתוח הוא תנאי הכרחי להן אבל לא תנאי מספיק. גם אחרי ההסתייגות הזאת, שני ממצאים במחקר חשובים במיוחד: יותר ממחצית מהערך מגיע לצרכנים ולאזרחים ולא לחברות, וכשליש ממנו נובע מעצם היכולת להשוות ביצועים בין גופים, מה שמכונה בנצ'מרקינג.`,
    ),

    p(
      `הנציבות האירופית עשתה את אותו תרגיל בקנה מידה של יבשת, `,
      a("במסמך ההערכה", SRC.ec),
      ` שליווה את תיקון הדירקטיבה לשימוש חוזר במידע ציבורי ב-2018. שם קו הבסיס צנוע יותר ומוגדר היטב: ערך כלכלי ישיר של 52 מיליארד אירו בשנה ל-28 מדינות האיחוד, כלומר ערך של מוצרים ושירותים שנבנו על מידע ציבורי, בעיקר על ידי עסקים קטנים. בתרחיש שבו לא משתנה דבר, המספר צפוי להגיע ל-149 מיליארד אירו ב-2030; עם התערבות רגולטורית שמרחיבה את הפתיחה, ל-215 מיליארד כבר ב-2028. בצד התעסוקה, מ-64,000 מועסקים על בסיס מידע ציבורי ל-518,000 עד 795,000 בתוך עשור, תלוי בתרחיש. ומאחורי הערך הישיר עומד ערך כולל, ישיר ועקיף, שנאמד ב-236 מיליארד אירו כיום ו-672 מיליארד ב-2030.`,
    ),

    p(
      `מעבר לכלכלה, `,
      a("מחקר שפורסם באפריל 2026", SRC.guoZhang),
      ` מספק עדות סיבתית ולא רק מתאמית. גואו וזאנג ניצלו את הפריסה המדורגת של פלטפורמות נתונים פתוחים ב-285 ערים בסין בין 2010 ל-2022 כניסוי טבעי, ובדקו מה קרה לרמת השירותים הציבוריים, במדד שמורכב מחינוך, בריאות, ביטחון סוציאלי, תשתיות, תרבות וירוק עירוני. התוצאה: פתיחת המידע שיפרה את השירותים באופן מובהק, והשיפור עבר בעיקר דרך שני ערוצים: השימוש בנתונים עצמם, ויכולת החדשנות הטכנולוגית של הערים. המסקנה הנלווית חשובה לא פחות מהממצא: פלטפורמה כשלעצמה אינה מספיקה. הערך נוצר רק כשהמידע נכנס למחזור של שימוש.`,
    ),

    h2("המקרה של מאגר אחד: כתובות בדנמרק"),

    p(
      `אומדני מאקרו הם מרשימים, אבל קל לפקפק בהם. לכן `,
      a("המקרה הדני", SRC.denmark),
      ` שווה קריאה, כי שם מדדו מאגר אחד, לפני ואחרי.`,
    ),

    p(
      `עד 1996 נאספו נתוני הכתובות בדנמרק על ידי 270 רשויות מקומיות, לכל אחת הסכמי גישה ותמחור משלה. גם אחרי שהנתונים אוחדו לרישום אחד, נוצר קיפאון: המשטרה, שירותי החירום והמשרד להגנת הסביבה רצו להשתמש בו, אבל כל רשות יכלה לקבוע מחיר משלה. מנהל התוכנית סיכם את זה כך:`,
    ),

    quote(
      "היו לנו הרבה נתונים טובים מאוד, אבל אף אחד לא השתמש בהם.",
      "מורטן לינד, מנהל תוכנית הכתובות הדנית",
    ),

    p(
      `הקיפאון נשבר רק כששר האוצר תיווך הסכם שפתח את המאגר לשימוש חינם ופיצה את הרשויות על אובדן ההכנסות. ההסכם נחתם ב-2002 ונכנס לתוקף בתחילת 2003, ומגבלות משפטיות דחו את יישומו המלא עד 2005.`,
    ),

    p(
      `המדידה שנעשתה ב-2010 מצאה שבין 2005 ל-2009 הניב המאגר הפתוח תועלת פיננסית ישירה של 62 מיליון אירו, מול עלות כוללת של 2 מיליון אירו, שמתוכם 1.3 מיליון היו הפיצוי לרשויות. לשנת 2010 לבדה צפו תועלת של 14 מיליון אירו מול עלות של 0.2 מיליון. וזו מדידה שמרנית: היא ספרה רק את התועלת למי שקיבל את הנתונים ישירות, לא את מה שקרה בהמשך השרשרת. מספר היישומים שהשתמשו בכתובות עלה משניים-שלושה ב-2005 ליותר מ-500 ב-2009. כ-70% מהמסירות היו לשוק הפרטי, אבל כ-30% מהתועלת נזקפה למגזר הציבורי עצמו, כי הממשלה היא בעצמה צרכנית מרכזית של המידע שלה.`,
    ),

    h2("הצד של הנזק"),

    p(
      `אם המספרים האלה נכונים בערך, אז מאגר סגור אינו מצב ניטרלי. הוא בחירה שיש לה מחיר, והספרות מנסחת אותו במפורש. מסמך הנציבות האירופית מגדיר את גביית התשלום על מידע ציבורי כבלתי מוצדקת מנקודת מבט מקרו-כלכלית, ומסביר למה: המידע נוצר ממילא כחלק משירות ציבורי; הוא לא מתכלה בצריכה; גמישות המחיר שלו גבוהה מאוד, כך שכל ירידה במחיר מולידה זינוק בשימוש; והגבייה עצמה עולה כסף, כי היא מחייבת מערכות חיוב ובקרה. התוצאה מוגדרת שם כעלות הזדמנות שנושאת בה החברה כולה.`,
    ),

    p(
      `שתי דוגמאות מהמסמך מדגימות איך זה נראה בשטח. חברה שבדית שמפתחת יישום ניווט ימי נדרשה לשלם עבור מפות ימיות סכומים שנעו בין 2,745 אירו בצרפת ל-18,900 אירו באיטליה, בעוד שהנתונים המקבילים בארצות הברית חינמיים. ובבלגיה, מרשם החברות הוצע לשימוש חוזר במחיר של 75,000 אירו בשנה. מאגר בעל ערך חברתי וכלכלי גבוה נוצל, בפועל, על ידי שתי חברות.`,
    ),

    p(
      `גם הצד ההפוך נמדד: מה קורה כשמורידים את המחיר. מחקר POPSIS של הנציבות משנת 2011 בדק מה קורה כשגוף ציבורי מוריד את החיוב לאפס או לעלות השולית של ההפצה, ומצא עלייה של 1,000% עד 10,000% בשימוש החוזר, כניסה של משתמשים חדשים, בעיקר עסקים קטנים, וכמעט ללא השפעה על העלות לגוף. `,
      a("הקדסטר הספרדי", SRC.jetzek),
      ` הוא דוגמה אחת: הוא נפתח למשתמשים לא-מסחריים ב-2004 ולמשתמשים מסחריים ב-2011, ומאז מספר החברות שמורידות נתונים גדל פי 15, הורדות המפות פי 80 וההורדות בכלל פי 100.`,
    ),

    p(
      `יש גם נזק שאינו כספי, והוא אולי המעניין יותר. במקרה הדני מצאו שב-2010 חברות שהעסיקו כ-15% מכוח העבודה היו רשומות בכתובת שלא הופיעה במאגר הרשמי, כי מרשם החברות אימץ אותו באיטיות. התוצאה: חודשים ולעיתים שנים עד שכתובת מסחרית חדשה או מעודכנת הופיעה במערכות הניווט, שעליהן נשענים גם שירותי החירום. וזה מוביל לתובנה שחוזרת בכל המקרים: מאגר שאיש לא משתמש בו הוא מאגר שאיש לא בודק. השגיאות מתגלות רק כשיש מספיק עיניים, והעיניים מגיעות רק כשהמידע פתוח.`,
    ),

    h2("למה המידע הגיאוגרפי הוא המקרה המובהק"),

    p(
      `בסקרי בעלי העניין באירופה, הקטגוריה שהציבור והתעשייה מבקשים לפתוח קודם כל היא המידע הגיאו-מרחבי: מפות, גבולות, כתובות. `,
      a("המדריך של הנציבות הגיאו-מרחבית הבריטית מ-2022", SRC.geospatial),
      ` מסביר גם למה דווקא המידע הזה מתקשה לגייס השקעה. ערכו מתממש לעיתים קרובות רק בשילוב עם מאגרים אחרים, ולכן קשה לתמחר אותו בנפרד; אין לו תחליפים; יש לו ערך אופציה גדול, כי שימושים שאינם קיימים היום ייווצרו מחר; וחלק גדול מהערך זולג לכלל הציבור, למשל כשניתוב טוב יותר מפחית גודש וזיהום. מחירי השוק לא משקפים את כל זה, וגוף שמנסה לכסות את עלויותיו ממכירת מפות מודד את הדבר הלא נכון.`,
    ),

    p(
      `גם כאן יש מספרים. מחקר קנדי מ-2016 העריך שמידע גיאוגרפי תורם 22 מיליארד דולר בשנה לכלכלה הקנדית, 1.1% מהתמ"ג. באוסטרליה, `,
      a("מחקר ACIL Tasman מ-2008", SRC.acil),
      ` העריך את תרומת המידע המרחבי לתמ"ג ב-6.4 עד 12.6 מיליארד דולר אוסטרלי, 0.6% עד 1.2%, ומצא במקביל שמדיניות התמחור והרישוי של גופי הממשלה פגעה ביעילות הגישה לנתונים. הוטון (2011) העריך את יחס התועלת לעלות מפתיחת המידע המרחבי האוסטרלי ב-13 ל-1. ובלונדון, נתוני התחבורה הציבורית שנפתחו בהדרגה החל מ-2009 הולידו יותר מ-600 יישומים, כ-500 משרות ותועלת שנתית לנוסעים שנאמדה ב-2017 בעד 130 מיליון ליש"ט. השיטה פשוטה: זמן הנסיעה שנחסך בזכות מידע טוב יותר מתורגם לכסף לפי ערכי הזמן שמשרד התחבורה הבריטי מפרסם.`,
    ),

    h2("השורה התחתונה"),

    p(
      `אפשר להתווכח על כל אומדן בנפרד: לטעון שמקינזי אופטימיים מדי, שקו הבסיס של הנציבות האירופית מודד ערך ישיר בלבד, שהמקרה הדני קטן. אבל הכיוון של כל המחקרים זהה, והפערים בין הצדדים אינם של אחוזים בודדים אלא של סדרי גודל: 62 מיליון מול 2 מיליון, פי 100 בהורדות, פי 13 בתועלת מול עלות. כשזה המצב, השאלה כבר אינה אם פתיחת מאגר משתלמת, אלא מי נושא בעלות של ההחלטה לא לפתוח אותו. התשובה של הספרות ברורה: לא המשרד המחזיק במאגר, אלא כולם חוץ ממנו.`,
    ),

    h2("מקורות"),

    p("המקורות שהוזכרו בפוסט, לפי סדר הופעתם:"),

    ol([
      [
        "McKinsey Global Institute, ",
        a("Open Data: Unlocking Innovation and Performance with Liquid Information", SRC.mckinsey),
        " (2013), תקציר מנהלים, עמ' 2, 6-9.",
      ],
      [
        "European Commission, ",
        a("Impact Assessment, SWD(2018) 127 final", SRC.ec),
        ", עמ' 6, 9-12, 33-35.",
      ],
      [
        "Guo, Y. & Zhang, Z., ",
        a(
          "How Open Government Data Enhances Public Service Delivery: A Quasi-Natural Experiment from Government Data Platforms",
          SRC.guoZhang,
        ),
        ", Systems 14(4), 408 (2026).",
      ],
      [
        "McMurren, Verhulst & Young, ",
        a("Denmark's Open Address Data Set", SRC.denmark),
        " (GovLab, 2016), עמ' 3-13.",
      ],
      [
        "De Vries, M. et al., POPSIS – Pricing of Public Sector Information Study (European Commission, 2011).",
      ],
      [
        "Jetzek, Avital & Bjørn-Andersen, ",
        a("The Value of Open Government Data", SRC.jetzek),
        " (2012), עמ' 7-8 (הקדסטר הספרדי, הוטון).",
      ],
      [
        "Geospatial Commission (UK), ",
        a(
          "Measuring the Economic, Social and Environmental Value of Public Sector Location Data",
          SRC.geospatial,
        ),
        " (2022), עמ' 3, 12-13, 20, 35, 37.",
      ],
      [
        "ACIL Tasman, ",
        a("The Value of Spatial Information", SRC.acil),
        " (2008), תקציר מנהלים. הקישור המקורי אינו זמין עוד; הקישור הוא לעותק בארכיון האינטרנט.",
      ],
    ]),
  ],
};

/* ─────────────────────────────── Runner ─────────────────────────────── */

async function main() {
  const author = await prisma.user.findUnique({ where: { email: "zomerg@gmail.com" } });
  if (!author) throw new Error("Author zomerg@gmail.com not found.");

  const tags = ["מידע ציבורי", "ממשל פתוח", "מאגרי מידע ממשלתיים", "כלכלת מידע"];

  const post = await prisma.plilistPost.upsert({
    where: { slug: SLUG },
    update: { title: TITLE, content, excerpt: EXCERPT, seoTitle: TITLE, seoDesc: EXCERPT, tags, status: "PUBLISHED" },
    create: {
      slug: SLUG,
      title: TITLE,
      content,
      excerpt: EXCERPT,
      seoTitle: TITLE,
      seoDesc: EXCERPT,
      tags,
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: author.id,
    },
  });

  const saved = await prisma.plilistPost.findUnique({ where: { slug: SLUG } });
  const words = JSON.stringify(saved?.content ?? {})
    .split('"text":"')
    .slice(1)
    .map((s) => s.split('"')[0])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  console.log(`post: /haplilist/${post.slug} | ${post.status} | published ${post.publishedAt?.toISOString()} | ~${words} words`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
