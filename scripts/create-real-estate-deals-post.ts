/**
 * Real-estate deals register (over.org.il/projects/deals):
 *   1. adds TheMarker's 27.9.2026 story to the /media list (live), tagged with
 *      the case tag so the post below pulls it in as its press coverage;
 *   2. creates the הפליליסט post about the release as a DRAFT (review in
 *      /admin/plilist, then publish).
 *
 * Idempotent: media matched on url, post upserted by slug. A re-run never
 * flips an already-published post back to draft.
 *
 * DATABASE: refuses to run unless DATABASE_URL points at the live xhostd DB
 * (the repo's .env still points at the retired Render DB).
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();
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

const offline = process.argv.includes("--dump") || process.argv.includes("--api");
if (dbHost !== LIVE_DB_HOST && !offline) {
  console.error(
    `Refusing to write: DATABASE_URL host is "${dbHost || "(unparseable)"}", expected ${LIVE_DB_HOST}.`,
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgres://offline" }),
});

const CASE_TAG = "real-estate-deals";

/* ─────────────────────────────── Sources ─────────────────────────────── */

const SRC = {
  deals: "https://www.over.org.il/projects/deals",
  nadlan: "https://www.over.org.il/nadlan",
  themarker:
    "https://www.themarker.com/realestate/2026-09-27/ty-article/.premium/000001a0-dccc-d259-a3b4-dcdc5e560000",
  nadlanit: "https://nadlanit.co.il/news/israel-real-estate-transactions-open-data",
  // Built on the register during its first week (checked 28.9.2026).
  svuyEmet: "https://nadlan-prices-il.vercel.app/",
  nadlanIl: "https://nadlan-il-one.vercel.app/",
  numbersguys: "https://numbersguys.com/Nadlan1/",
  kaneMida: "https://kane-mida.vercel.app/",
  shukshuk: "https://shukshuk.co.il/he/metziot",
  karnaf: "https://analyst.karnafnadlan.com/",
  avivRepo: "https://github.com/aviv4339/nadlan",
};

/* ─────────────────────────── /media item ─────────────────────────── */

const MEDIA = {
  title: "גישה ל–3.8 מיליון עסקות נדל\"ן: מאגר הנתונים שהמדינה סירבה לפתוח",
  description:
    "כל מכירות הנכסים בישראל מאז שנות ה-90 פורסמו לשימוש חופשי בגרסאות לעם: הורדה, חיפוש, ניתוח והשוואה, וגם שימוש בכלי AI. על המגבלות של אתר רשות המסים, החלטת הממשלה מ-2016 שלא מומשה, ושיחות של יותר משנתיים עם הנהלת הרשות",
  type: "article",
  source: "TheMarker",
  date: "2026-09-27",
  url: SRC.themarker,
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

const quote = (text: string) => ({ type: "blockquote", content: [p(text)] });

const ul = (items: Part[][]) => ({
  type: "bulletList",
  content: items.map((parts) => ({ type: "listItem", content: [p(...parts)] })),
});

/* ──────────────────────────────── Post ──────────────────────────────── */

const SLUG = "real-estate-deals-open";
const TITLE = "3.8 מיליון עסקאות נדל\"ן, ושבוע אחד";
const EXCERPT =
  "פתחתי את מאגר עסקאות המקרקעין של רשות המסים, מ-1998 ועד היום, לשימוש חופשי. תוך שבוע כבר נבנו עליו מחשבוני שווי, לוחות מחוונים, מחקר שוק, השוואות בין ערים ומנוע שמאתר דירות מתחת למחיר השוק.";

const content = {
  type: "doc",
  content: [
    p(b(EXCERPT)),

    p(
      `בשבוע שעבר העליתי ל`,
      a("גרסאות לעם", SRC.deals),
      ` את מאגר עסקאות הנדל"ן המלא: 3.844 מיליון עסקאות מאז ינואר 1998, מתוכן 2.23 מיליון דירות, עם 47 שדות לכל עסקה, ובהם יישוב, גוש, חלקה ותת-חלקה, תאריך, שווי מדווח, מהות העסקה, שטח, מספר חדרים ושנת בנייה. `,
      a("TheMarker", SRC.themarker),
      ` סיקר את הפרסום ביום ראשון, ובעקבותיו גם `,
      a("נדל\"נית", SRC.nadlanit),
      `.`,
    ),

    h2("מידע שלא היה סודי, ובכל זאת היה סגור"),

    p(
      `המידע הזה מעולם לא היה אמור להיות חסוי. מחירי הנכסים, הכתובות והפרטים הנוספים מופיעים כבר שנים באתר של רשות המסים. אבל באתר של הרשות אי אפשר לשאול שאלה שיש לה יותר מ-150 תשובות: מעבר לזה, החיפוש פשוט נחסם. וגם כל ההשוואות הרחבות, בין ערים, בין שכונות, לאורך שנים, אינן אפשריות שם.`,
    ),

    p(
      `ב-2016 קיבלה הממשלה החלטה שמאגרי המידע שלה יהיו פתוחים כברירת מחדל, אלא אם יש סיבה ממשית שלא, כמו פגיעה בפרטיות או בביטחון. היעד היה פתיחה רחבה בתוך חמש שנים. זה לא קרה. המאגר הזה בפרט נבחר בגלל הביקוש: על אף מאגר לא קיבלתי כל כך הרבה פניות. יותר משנתיים ניסיתי לקדם את פתיחתו מול הנהלת רשות המסים, בשיחות לא פורמליות. התשובה הייתה שפרסום המאגר הוא דבר נורא ומאיים.`,
    ),

    p(
      `רשות המסים מסרה ל-TheMarker שהחלטת הממשלה אינה מתייחסת במפורש למאגר הנדל"ן, ושאין בה כדי לגבור על חובת הסודיות לפי סעיף 105(א) לחוק מיסוי מקרקעין ועל היבטי הפרטיות שעולים מתיקון 13 לחוק הגנת הפרטיות. אבל זה בדיוק העניין: המידע הזה כבר מתפרסם, לכל אחד, עסקה אחרי עסקה. מה שנשאר סגור הוא לא המידע, אלא היכולת לעבוד איתו.`,
    ),

    quote(
      "הממשלה עוסקת כל היום ב-AI, ואני אומר: לא. אני רוצה את המידע כמה שיותר גולמי. אל תיגעו בו, אל תשחקו בו. אנחנו נשפוך אותו לאינטרנט, ואחרי זה הציבור יידע לעשות בו את השימוש המיטבי.",
    ),

    h2("מה יש במאגר, ואיך קוראים אותו"),

    ul([
      [b("חיפוש וסינון"), " לפי יישוב, גוש וחלקה, תאריך, מהות העסקה ושווי, ישירות באתר."],
      [b("הורדה"), " של הנתונים, לעבודה בכל כלי."],
      [b("API"), " לבניית מוצרים מעל המאגר, בלי לגרד שום אתר."],
      [b("שרת MCP"), " שמחבר את המאגר ל-Claude ולעוזרי בינה מלאכותית אחרים, כך שאפשר לשאול עליו בשפה חופשית."],
      [
        b("כתובות"),
        ": הכתובות והחיפוש לפי כתובת באים מהצלבה עם ",
        a("נדל\"ן לעם", SRC.nadlan),
        ", שמקשר כל כתובת לחלקה.",
      ],
    ]),

    p(
      `המאגר מתפרסם כפי שהוא, ואני לא מתעלם מכך שיש בו בעיות. מבקר המדינה כתב עליו שני דוחות, ויש בו סיווגים חריגים, כפילויות ועסקאות פרויקטליות. שורה אחת יכולה להיות דירה אחת או בניין שלם, ולכן ממוצע מטעה וחציון עדיף. השוואה בין שנים או בין יישובים צריכה להיעשות בתוך אותה מהות עסקה. והשטח הוא שטח הנכס כולו, בעוד שהשווי משולם רק על החלק שנמכר, ולכן המאגר מציג גם מחיר למ"ר מנורמל לחלק הנמכר. אבל כשמפרסמים מאגר כמו שהוא, אפשר גם למצוא בו את מה שחורג מהנורמלי, ובמאגר שנשאר סגור, אף אחד לא מחפש.`,
    ),

    h2("השבוע הראשון: מי כבר רוכב עליו"),

    p(
      `הטענה שמידע פתוח מייצר ערך רק כשאחרים בונים עליו היא לא חדשה, `,
      a("כתבתי עליה כאן", "/haplilist/what-is-a-closed-database-worth"),
      `. אבל נדיר לראות אותה מתממשת בקצב כזה. בתוך שבוע מהפרסום, בלי שום תיאום איתי, עלו לפחות שבעה פרויקטים עצמאיים שמבוססים על המאגר:`,
    ),

    ul([
      [
        a("שווי אמת", SRC.svuyEmet),
        `: הערכת שווי לדירה לפי כתובת, שמשלבת את עסקאות רשות המסים עם מאגר התכניות של מינהל התכנון, מתחמי התחדשות עירונית ונתוני הלמ"ס, הכול דרך הממשק של גרסאות לעם. היוצרים גם בדקו את עצמם: טעות חציונית של 8.6% מול 108 מכירות אמיתיות.`,
      ],
      [
        a("הערכת שווי לפי עסקאות שנסגרו", SRC.nadlanIl),
        `: עוד מחשבון שווי, שמדגיש שהוא עובד לפי מחירי עסקאות שנסגרו בפועל ולא לפי מחירי בקשה.`,
      ],
      [
        a("קנה מידה", SRC.kaneMida),
        `: "איזו דירה אפשר לקנות בשלושה מיליון שקל?" אותו תקציב, ושטח שונה בכל עיר. מגמות שנתיות, מחיר חציוני למ"ר מנורמל לחלק הנמכר, והשוואה בין ערים. היוצר אפילו בדק עשר חלקות ומצא פערים בין שני אתרים ממשלתיים.`,
      ],
      [
        a("Numbers Guys", SRC.numbersguys),
        `: כלי ויזואליזציה לעסקאות מגורים, עם סינון לפי שנה, מחיר, שטח, חדרים, קומה וגיל הבניין, והשוואה ודירוג של שכונות וערים. הוא נבנה במקור על המאגר החלקי שפרסמנו ב"מידע לעם", ועכשיו שילב גם את נתוני רשות המסים, שמאפשרים לעקוב אחרי מכירות חוזרות של אותו נכס לאורך זמן.`,
      ],
      [
        a("שוקשוק", SRC.shukshuk),
        `: לוח מודעות שמשווה את מחיר הבקשה של כל דירה למכירה לעסקאות אמיתיות דומות בשכונה, ומסמן "מציאות": דירות שמוצעות מתחת למה שנמכרו בפועל דירות דומות. זה בדיוק מה שתיארתי בכתבה: כשהמתווך אומר לך מה מחיר הדירה, אתה לוחץ ומקבל את המחירים האמיתיים באזור.`,
      ],
      [
        a("קרנף אנליסט", SRC.karnaf),
        `: מחקר שוק הדיור ברמת העיר. בדיקת מחיר לכתובת מול עסקאות אמת באותו רחוב, ערים "חמות", דירוג העליות והירידות במחירי יד שנייה, פרמיית הדירות החדשות, ועשרות תובנות שמחושבות אוטומטית ממאגר העסקאות ומוצלבות עם נתוני הלמ"ס והאוצר.`,
      ],
      [
        a("nadlan", SRC.avivRepo),
        `: קוד פתוח ב-GitHub, כלי ל-Claude שמקבל בקשה בשפה חופשית, פונה לשרתי ה-MCP של גרסאות לעם, ומחזיר דוח HTML עם מפת גושים וחלקות, גרפים וטבלה לייצוא.`,
      ],
    ]),

    p(
      `שימו לב מה יש כאן: שלושה מחשבוני שווי בגישות שונות, כלי השוואה, פלטפורמת מחקר שוק, לוח מודעות וכלי AI. אף אחד מהם לא היה אפשרי כשהחיפוש נחסם אחרי 150 תוצאות. ואף אחד מהם לא היה מתוכנן על ידי משרד ממשלתי. זה הערך של מאגר פתוח, והוא התחיל להיווצר תוך ימים.`,
    ),

    p(
      b("בניתם משהו מעל המאגר?"),
      ` אפליקציה, דוח, מחקר, כתבה? `,
      a("ספרו לי", "/contact"),
      ` ואוסיף אותו לרשימה.`,
    ),
  ],
};

/* ─────────────────────────────── Runner ─────────────────────────────── */

async function upsertMedia() {
  const existing = await prisma.mediaAppearance.findFirst({ where: { url: MEDIA.url } });
  const data = { ...MEDIA, isActive: true, caseTag: CASE_TAG };
  if (existing) {
    await prisma.mediaAppearance.update({ where: { id: existing.id }, data });
    console.log(`media: updated ${existing.id}`);
  } else {
    const created = await prisma.mediaAppearance.create({ data });
    console.log(`media: created ${created.id}`);
  }
}

async function upsertPost() {
  const author = await prisma.user.findUnique({ where: { email: "zomerg@gmail.com" } });
  if (!author) throw new Error("Author zomerg@gmail.com not found.");

  const tags = ["מידע ציבורי", "נדל\"ן", "גרסאות לעם", "מאגרי מידע ממשלתיים"];
  const fields = { title: TITLE, content, excerpt: EXCERPT, seoTitle: TITLE, seoDesc: EXCERPT, tags, caseTag: CASE_TAG };

  const post = await prisma.plilistPost.upsert({
    where: { slug: SLUG },
    update: fields,
    create: { slug: SLUG, ...fields, status: "DRAFT", authorId: author.id },
  });
  console.log(`post: /haplilist/${post.slug} | ${post.status}`);
}

/**
 * --api: upload through the site's write API instead of the database.
 * Needs ZG_API_KEY (an /admin/api-keys key with plilist:draft + media:write),
 * from the environment or the gitignored .env.local.
 */
async function viaApi() {
  const site = process.env.ZG_SITE ?? "https://www.z-g.co.il";
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const put = async (path: string, body: unknown) => {
    const res = await fetch(site + path, {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${path} -> ${res.status} ${text}`);
    return JSON.parse(text);
  };
  const tags = ["מידע ציבורי", "נדל\"ן", "גרסאות לעם", "מאגרי מידע ממשלתיים"];
  console.log("media:", await put("/api/v1/media-appearances", { ...MEDIA, isActive: true, caseTag: CASE_TAG }));
  console.log(
    "post:",
    await put(`/api/v1/plilist/${SLUG}`, {
      title: TITLE, content, excerpt: EXCERPT, seoTitle: TITLE, seoDesc: EXCERPT, tags, caseTag: CASE_TAG,
    }),
  );
}

async function main() {
  if (process.argv.includes("--api")) return viaApi();
  // --dump: print the payloads (for posting through the admin API) and stop.
  if (process.argv.includes("--dump")) {
    const tags = ["מידע ציבורי", "נדל\"ן", "גרסאות לעם", "מאגרי מידע ממשלתיים"];
    console.log(JSON.stringify({
      media: { ...MEDIA, isActive: true, caseTag: CASE_TAG },
      post: { slug: SLUG, title: TITLE, content, excerpt: EXCERPT, seoTitle: TITLE, seoDesc: EXCERPT, tags, caseTag: CASE_TAG, status: "DRAFT" },
    }));
    return;
  }
  await upsertMedia();
  await upsertPost();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
