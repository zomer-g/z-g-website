/**
 * Article: עיון בתיק בית משפט — general inspection right + crime victims.
 *
 * Uploads the nine rulings the article is built on into uploaded_files
 * (served at /uploads/<filename>, no deploy needed) and upserts the post on
 * its slug. Seeds as DRAFT; pass --live to publish.
 *
 * DATABASE_URL must point at the live DB (db.xhostd.com). The local .env still
 * points at the retired Render DB, so pass it in the environment.
 * RULINGS_DIR = folder holding the PDFs named in FILES below.
 */
import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const LIVE = process.argv.includes("--live");
const DIR = process.env.RULINGS_DIR ?? ".";

const FILES: Record<string, { src: string; name: string }> = {
  pazgaz: { src: "a1.pdf", name: "iyun-ea-8849-01-paz-gaz.pdf" },
  patriarch: { src: "a2.pdf", name: "iyun-bagatz-9970-05-patriarch.pdf" },
  klein: { src: "a3.pdf", name: "iyun-rea-943-15-klein.pdf" },
  tulip: { src: "a4a.pdf", name: "iyun-rea-3863-15-tulip.pdf" },
  globalGreen: { src: "a5.pdf", name: "iyun-aam-3195-18-global-green.pdf" },
  anshin: { src: "a6.pdf", name: "iyun-tpch-306-10-anshin.pdf" },
  zian: { src: "a7s.pdf", name: "iyun-tpch-5376-12-09-zian.pdf" },
  plonit: { src: "a8.pdf", name: "iyun-rea-1675-21-plonit.pdf" },
  victimAppeal: { src: "a9.pdf", name: "iyun-ap-6697-20-victim.pdf" },
};
const url = (k: keyof typeof FILES) => `/uploads/${FILES[k].name}`;

function t(text: string) { return { type: "text", text }; }
function tb(text: string) { return { type: "text", text, marks: [{ type: "bold" }] }; }
function ti(text: string) { return { type: "text", text, marks: [{ type: "italic" }] }; }
function tl(text: string, href: string) {
  return { type: "text", text, marks: [{ type: "link", attrs: { href, target: "_blank" } }] };
}
function h2(text: string) { return { type: "heading", attrs: { level: 2 }, content: [t(text)] }; }
function h3(text: string) { return { type: "heading", attrs: { level: 3 }, content: [t(text)] }; }
function p(...nodes: unknown[]) { return { type: "paragraph", content: nodes }; }
function li(...nodes: unknown[]) { return { type: "listItem", content: [p(...nodes)] }; }
function ul(...items: unknown[]) { return { type: "bulletList", content: items }; }
function ol(...items: unknown[]) { return { type: "orderedList", content: items }; }
function infoBlock(title: string, variant: string, icon: string, rows: unknown[][]) {
  return { type: "infoBlock", attrs: { icon, title, variant }, content: rows.map((r) => p(...r)) };
}
function lawBlock(title: string, disclaimer: string, items: { lawName: string; quote: string; url: string }[]) {
  return { type: "lawBlock", attrs: { icon: "BookOpen", title, disclaimer, items: JSON.stringify(items) } };
}

const content = { type: "doc", content: [
  p(ti("מאמר זה נועד לספק מידע כללי בלבד ואינו מהווה ייעוץ משפטי. כל מקרה הוא ייחודי, ולכן חשוב לפנות לייעוץ משפטי פרטני.")),

  h2("מה זה עיון בתיק בית משפט?"),
  p(t("תיק בית משפט כולל את כתבי הטענות, הפרוטוקולים, הראיות וההחלטות. בעלי הדין עצמם יכולים לעיין בו כמעט תמיד. השאלה המעניינת היא מה קורה כשמי שמבקש/ת לעיין אינו/ה צד להליך: עורך/ת דין שמטפל/ת בתיק דומה, נושה, שכן/ה ששוקל/ת תובענה ייצוגית, או נפגע/ת עבירה שרוצה לדעת מה נאמר בתיק הפלילי.")),
  p(t("התשובה הקצרה: כל אדם רשאי לבקש. הזכות נגזרת מעקרון פומביות הדיון. בתי המשפט פתוחים לציבור, וכך גם, ככלל, התיקים שלהם. אבל הזכות אינה מוחלטת, ובית המשפט מאזן אותה מול זכויות אחרות, ובראשן הפרטיות.")),

  lawBlock("מה אומרת התקנה", "ציטוט מתוך תקנה 4 לתקנות בתי המשפט ובתי הדין לעבודה (עיון בתיקים), התשס\"ג-2003, כפי שהוא מובא בפסיקה.", [
    { lawName: "תקנה 4(א): מי רשאי לבקש", quote: "כל אדם רשאי לבקש מבית משפט לעיין בתיק בית משפט (להלן - בקשת עיון), ובלבד שהעיון בו אינו אסור על פי דין.", url: "" },
    { lawName: "תקנה 4(ד): מה בית המשפט שוקל", quote: "בבואו לשקול בקשת עיון, ייתן בית המשפט את דעתו, בין השאר, לענינו בתיק של המבקש, לענינם של בעלי הדין ושל מי שעלול להיפגע כתוצאה מהעיון, וכן לסבירות הקצאת המשאבים הנדרשת לשם היענות לבקשה.", url: "" },
    { lawName: "תקנה 4(ו): עיון בתנאים", quote: "החליט בית המשפט להתיר את העיון, רשאי הוא לקבוע בהחלטתו כל תנאי או הסדר הדרושים כדי לאזן בין הצורך בעיון לבין הפגיעה אשר עלולה להיגרם לבעלי הדין או לצד שלישי בשל העיון, לרבות השמטת פרטים, הגבלת מספר המעיינים ונקיטת אמצעים למניעת זיהוים של בעלי דין או אנשים אחרים...", url: "" },
  ]),

  h2("איך בית המשפט מחליט: שלושה שלבים"),
  p(t("בשנת 2005 קבע רשם בית המשפט העליון, ב"), tl("ע\"א 8849/01 (עניין פז-גז)", url("pazgaz")), t(", מבחן בשלושה שלבים. מאז הוא מיושם כמעט בכל בקשת עיון:")),
  ol(
    li(tb("האם העיון אסור בחוק?"), t(" למשל, מסמכים שחלה עליהם סודיות מס. אם יש איסור, הבקשה נעצרת כאן.")),
    li(tb("האם העיון מוצדק?"), t(" נקודת המוצא היא שכן. מי שמתנגד/ת לעיון צריך/ה לשכנע אחרת.")),
    li(tb("איך מאפשרים את העיון בפגיעה מינימלית?"), t(" למשל, מוציאים מסמכים רגישים מהעיון, או מגבילים את השימוש בחומר.")),
  ),

  h2("מבקשים לעיין? מספיק הסבר קצר"),
  p(t("לא צריך להוכיח עניין אישי בתיק. מספיק הסבר קצר וענייני למה העיון נחוץ. אלה דוגמאות לבקשות שהתקבלו:")),
  ul(
    li(tb("תיק עם אותה שאלה משפטית"), t(": עורך דין שטיפל בתיק דומה הורשה לעיין בכתבי הטענות בערעור מס של חברה אחרת ("), tl("עניין פז-גז", url("pazgaz")), t(").")),
    li(tb("תביעה תלויה ועומדת"), t(": עורכי דין שתבעו שכר טרחה הורשו לעיין בנספחי עתירה שעסקו בחובות הנתבעת ("), tl("בג\"ץ 9970/05", url("patriarch")), t(").")),
    li(tb("תביעה נגזרת"), t(": בעלת מניות ביקשה לעיין בתיק כדי לתמוך בבקשה לאישור תביעה נגזרת נגד בעלי השליטה ("), tl("רע\"א 3863/15", url("tulip")), t(").")),
    li(tb("תובענה ייצוגית"), t(": תושב שגר ליד אתר פסולת הורשה לעיין בחומרי המשרד להגנת הסביבה, ולא נדרש להסביר איך בדיוק ישתמש בהם ("), tl("עע\"מ 3195/18", url("globalGreen")), t(").")),
    li(tb("נושה"), t(": נושה של בעל מניות בחברה שבכינוס הורשתה לעיין בתיק הכינוס ("), tl("רע\"א 943/15", url("klein")), t(").")),
  ),

  h2("מתנגדים לעיון? הנטל עליכם"),
  p(t("מי שמתנגד/ת לעיון צריך/ה להציג טעם כבד משקל ולהסביר איזו פגיעה קונקרטית ייצור העיון, ובאילו מסמכים. אמירות כלליות לא מספיקות.")),

  infoBlock("טענות שבתי המשפט דחו", "error", "XCircle", [
    [tb("\"יש כאן סודות מסחריים\""), t(", בלי להצביע על מסמך ספציפי.")],
    [tb("\"זה מסע דיג\""), t(", כשהמבקש/ת הציג/ה מטרה לגיטימית.")],
    [tb("\"הנתונים כבר לא עדכניים\""), t(". את זה אפשר לטעון בהליך שבו ייעשה בהם שימוש.")],
    [tb("\"החומר לא יהיה קביל כראיה\""), t(". זו לא סיבה לשלול עיון.")],
    [tb("\"זה עוקף את חוק חופש המידע\""), t(". מדובר בשני מסלולים נפרדים, שכל אחד מהם נבחן לגופו.")],
    [tb("\"יש חיסיון בנק-לקוח\""), t(", כשהלקוח עצמו לא התנגד לעיון.")],
  ]),

  infoBlock("מה כן יכול להצדיק הגבלה", "warning", "AlertTriangle", [
    [t("פגיעה בפרטיות, במיוחד במידע רפואי או נפשי.")],
    [t("סוד מסחרי ממשי, בפרט כשמי שמבקש לעיין הוא מתחרה עסקי.")],
    [t("מסמכים שחלה עליהם סודיות לפי דין, כמו דוחות שהוגשו לרשויות המס.")],
    [t("פגיעה בצדדים שלישיים ששמם או פרטיהם מופיעים בתיק.")],
  ]),

  h2("לא הכל או כלום"),
  p(t("גם כשיש סיבה להגביל, הפתרון הוא בדרך כלל עיון חלקי ולא סירוב. בעניין פז-גז הותר עיון בכל התיק, למעט תיק המוצגים שכלל דוחות כספיים. בבג\"ץ 9970/05 הותר העיון, בתנאי שהחומר ישמש רק למטרה שלשמה התבקש.")),
  p(t("ב"), tl("רע\"א 943/15", url("klein")), t(" קבע בית המשפט העליון שנקודת המוצא היא עיון בתיק כולו. אי אפשר לדרוש ממי שמבקש/ת לעיין לציין מראש אילו מסמכים הוא/היא רוצה לראות, בתיק שהוא/היא בכלל לא מכיר/ה. ב"), tl("רע\"א 3863/15", url("tulip")), t(" נדחתה התנגדות גורפת, והמתנגדים קיבלו שהות להצביע על מסמכים ספציפיים שלטענתם אין לחשוף.")),

  h2("נפגעי ונפגעות עבירה: זכות עיון \"מוגברת\""),
  p(t("נפגע/ת עבירה אינו/ה צד להליך הפלילי, שמתנהל בין המדינה לנאשם/ת. חוק זכויות נפגעי עבירה מעניק זכות לקבל את כתב האישום ולנכוח בדיונים, גם כשהם בדלתיים סגורות. אבל הוא לא מסדיר עיון בתיק בית המשפט כולו. לכן גם נפגעי עבירה מגישים בקשת עיון לפי התקנות.")),
  p(t("בית המשפט העליון קבע שלנפגע/ת העבירה יש זכות עיון \"מוגברת\", חזקה יותר מזו של אדם מן השורה, והיא חלה גם על מסמכים רגישים ("), tl("ע\"פ 6697/20", url("victimAppeal")), t("). בתי המשפט המחוזיים הגיעו לתוצאות דומות בדרכים שונות. בירושלים הוצע לראות בנפגעת כמו בעלת דין ("), tl("עניין אנשין", url("anshin")), t("). בחיפה נקבע שהנפגע מבקש לעיין כמו כל אדם אחר, ובכל זאת הותר לו לעיין ברוב התיק ("), tl("עניין זיאן", url("zian")), t(").")),

  h3("דלתיים סגורות אינן סוף פסוק"),
  p(t("תיקים של עבירות מין ואלימות במשפחה מתנהלים לא פעם בדלתיים סגורות או תחת איסור פרסום. זה לא הופך את העיון לאסור. נפגע/ת העבירה רשאי/ת ממילא לשבת בדיונים האלה, וקשה לנמק למה אסור לו/לה לקרוא את הפרוטוקול שלהם. עם זאת, היתר עיון אינו היתר לפרסם.")),

  h3("ומה אם הנאשם זוכה?"),
  p(t("ב"), tl("רע\"א 1675/21", url("plonit")), t(" זוכה הנאשם, ובית המשפט המחוזי התיר למתלוננת לעיין רק בהכרעת הדין. בית המשפט העליון הרחיב את העיון גם לפרוטוקולי הדיונים. הנימוק: עד הזיכוי היא הייתה נפגעת עבירה, ולכן היה לה ממילא הזכות לנכוח בדיונים. מנגד, בית המשפט קבע שכדי לבחון תביעה אזרחית אין צורך בתיק כולו. כלומר, הזיכוי לא מבטל את זכות העיון, אבל עשוי לצמצם אותה.")),

  h3("מה בדרך כלל נשאר בחוץ"),
  p(t("פרטיות הנאשם/ת היא השיקול הנגדי המרכזי. בפועל, בתי המשפט מוציאים מהעיון חוות דעת פסיכיאטריות, מסמכים רפואיים ותסקירים, ומתנים את העיון בהתחייבות שלא להשתמש בחומר לצורך אחר. בעניין אנשין הותר עיון גם בחוות הדעת הפסיכיאטרית, משום שממצאיה כבר פורסמו.")),

  infoBlock("לנפגעי ונפגעות עבירה: מה חשוב לדעת", "success", "CheckCircle", [
    [t("אפשר לבקש לעיין בתיק גם כשאינכם צד פורמלי להליך, כולל בערעור.")],
    [t("מטרות כמו בחינת תביעה אזרחית, הגנה מפני מסוכנות, או הצורך לדעת מה קרה, הוכרו כמטרות לגיטימיות.")],
    [t("זה שלא נכחתם בדיונים לא ייזקף לחובתכם.")],
    [t("תיק החקירה (במשטרה או בפרקליטות) הוא מסלול נפרד מתיק בית המשפט. הבקשה לעיין בו מוגשת לרשויות התביעה, ולא לפי תקנות העיון.")],
    [t("צפו לתנאים: שימוש בחומר רק למטרה שהוצגה, ובלי לפרסם.")],
  ]),

  h2("הפסיקה שעליה מבוסס המאמר"),
  p(t("כל ההחלטות זמינות לקריאה במלואן:")),
  infoBlock("זכות העיון הכללית", "default", "Gavel", [
    [tl("ע\"א 8849/01 פקיד השומה למפעלים גדולים נ' פז-גל (2005)", url("pazgaz")), t(": המבחן התלת-שלבי.")],
    [tl("בג\"ץ 9970/05 הפטריארך היווני האורתודוקסי נ' ממשלת ישראל (2010)", url("patriarch")), t(": על המתנגד להציג פגיעה קונקרטית.")],
    [tl("רע\"א 943/15 קליין נ' בנק דיסקונט (2015)", url("klein")), t(": עיון בתיק כולו כברירת מחדל.")],
    [tl("רע\"א 3863/15 קרן טוליפ (2016)", url("tulip")), t(": טענת סוד מסחרי כללית אינה מספיקה.")],
    [tl("עע\"מ 3195/18 גלובל גרין גרופ נ' המועצה המקומית שהם (2019)", url("globalGreen")), t(": תקנות העיון וחוק חופש המידע הם מסלולים מקבילים.")],
  ]),
  infoBlock("נפגעי עבירה", "default", "Gavel", [
    [tl("תפ\"ח (י-ם) 306-10 מדינת ישראל נ' אנשין (2010)", url("anshin")), t(": נפגעת עבירה כבעלת דין לעניין העיון.")],
    [tl("תפ\"ח (חי') 5376-12-09 מדינת ישראל נ' זיאן (2011)", url("zian")), t(": עיון בלי החומר הנפשי-רפואי.")],
    [tl("רע\"א 1675/21 פלונית נ' מדינת ישראל (2021)", url("plonit")), t(": עיון לאחר זיכוי.")],
    [tl("ע\"פ 6697/20 מדינת ישראל נ' פלוני (2021)", url("victimAppeal")), t(": זכות עיון \"מוגברת\" לנפגעת עבירה.")],
  ]),

  p(ti("מאמר זה נכתב כמידע כללי בלבד. לייעוץ פרטני המותאם לנסיבות שלכם, צרו קשר.")),
]};

async function main() {
  const host = (process.env.DATABASE_URL ?? "").split("@")[1]?.split(/[:/]/)[0];
  console.log("DB host:", host);
  if (host !== "db.xhostd.com") throw new Error("DATABASE_URL is not the live xhostd DB");

  for (const f of Object.values(FILES)) {
    const data = await readFile(path.join(DIR, f.src));
    await prisma.uploadedFile.upsert({
      where: { filename: f.name },
      create: { filename: f.name, mimeType: "application/pdf", size: data.length, data },
      update: { mimeType: "application/pdf", size: data.length, data },
    });
    console.log("file", f.name, data.length);
  }

  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user found");

  const slug = "court-file-inspection-rights";
  const data = {
    title: "עיון בתיק בית משפט: מי רשאי לעיין, מתי אפשר להתנגד, ומה הזכויות של נפגעי עבירה",
    content: content as unknown as Record<string, unknown>,
    excerpt: "כל אדם רשאי לבקש לעיין בתיק בית משפט, אבל הזכות אינה מוחלטת. מדריך מעשי: איך בית המשפט מחליט, אילו התנגדויות עובדות, ומה מעמדם של נפגעי עבירה.",
    category: "הליכים-משפטיים",
    tags: ["עיון בתיק", "פומביות הדיון", "נפגעי עבירה", "פרטיות", "תקנות העיון"],
    seoTitle: "עיון בתיק בית משפט: מדריך מעשי, כולל לנפגעי עבירה",
    seoDesc: "מי רשאי לעיין בתיק בית משפט? איך בית המשפט מאזן בין פומביות לפרטיות, ומה הזכויות של נפגעי עבירה? מדריך מבוסס פסיקה.",
    ...(LIVE ? { status: "PUBLISHED" as const, publishedAt: new Date() } : {}),
  };
  const post = await prisma.post.upsert({
    where: { slug },
    create: { ...data, slug, authorId: user.id, status: LIVE ? "PUBLISHED" : "DRAFT" },
    update: data,
  });
  console.log(`${post.status}: /articles/${post.slug}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
