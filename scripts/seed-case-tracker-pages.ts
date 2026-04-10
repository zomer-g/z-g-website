import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function t(text: string) { return { type: "text", text }; }
function tb(text: string) { return { type: "text", text, marks: [{ type: "bold" }] }; }
function tl(text: string, href: string) { return { type: "text", text, marks: [{ type: "link", attrs: { href } }] }; }
function h2(text: string) { return { type: "heading", attrs: { level: 2 }, content: [t(text)] }; }
function h3(text: string) { return { type: "heading", attrs: { level: 3 }, content: [t(text)] }; }
function p(...nodes: unknown[]) { return { type: "paragraph", content: nodes }; }
function li(...nodes: unknown[]) { return { type: "listItem", content: [p(...nodes)] }; }
function ul(...items: unknown[]) { return { type: "bulletList", content: items }; }
function hr() { return { type: "horizontalRule" }; }

function infoBlock(title: string, variant: string, icon: string, items: string[]) {
  return { type: "infoBlock", attrs: { icon, title, variant }, content: items.map(item => p(t(item))) };
}

/* ── Main page ── */
function buildMainPage() {
  return { type: "doc", content: [
    h2("מה התוסף עושה?"),
    p(t("התוסף סורק דפי אינטרנט שאתם גולשים בהם, מזהה אזכורים של מספרי תיקים משפטיים ישראליים, ושולף ממאגר "), tb("Tag-It"), t(" תקצירים של פסקי דין והחלטות שניתנו באותם תיקים. הכול מוצג ישירות לצד הדף הנקרא, ללא צורך לעבור בין חלונות.")),

    h2("יכולות"),
    ul(
      li(tb("זיהוי אוטומטי"), t(": מזהה עשרות סוגי הליכים, בג\"ץ, ע\"א, ת\"צ, עת\"מ, ת\"א, רע\"א, ע\"ע ועוד רבים. תומך בפורמט החדש (2010+) ובפורמט הישן.")),
      li(tb("תקצירי פסיקה"), t(": מציג תקציר, שמות צדדים, בית משפט ותאריך פסיקה. תומך במספר החלטות לתיק, מדורגות לפי רלוונטיות.")),
      li(tb("פרטיות ושקיפות"), t(": הסריקה מקומית. לשרת נשלחים רק מספרי התיקים. יומן שקיפות מלא בתוך התוסף מציג בדיוק מה יוצא מהדפדפן.")),
      li(tb("הדגשה בדף"), t(": אסמכתאות מודגשות בצבע לזיהוי מהיר.")),
      li(tb("חלון מידע צף"), t(": ריחוף מעל אסמכתא מציג תקציר.")),
      li(tb("לוח צד"), t(": רשימת כל האסמכתאות שזוהו עם פרטים מלאים.")),
      li(tb("חיפוש ידני"), t(": חיפוש לפי מספר תיק מתוך לוח הצד.")),
      li(tb("צפייה במסמך המקורי"), t(": קישור ישיר למסמך מאגר הפסיקה.")),
    ),

    infoBlock("הסתייגות לגבי תקצירים מבוססי מודלי שפה (AI)", "warning", "AlertTriangle", [
      "חלק מהתקצירים מופקים באמצעות מודלי שפה גדולים (LLM). מודלים אלה עלולים לטעות, לבדות ציטוטים, או להציג בצורה שגויה את עמדת בית המשפט. אין להסתמך על התקצירים כתחליף לקריאת פסק הדין המקורי.",
    ]),

    infoBlock("הסתייגות לגבי מבנה מספרי תיקים", "warning", "AlertTriangle", [
      "עד שנת 2010 לא היה מספור אחיד, אותו מספר יכול להופיע בתיקים שונים. לגבי פסיקה שקדמה ל-2010, התוסף אינו מבטיח התאמה מהימנה. כמו כן, התוסף אינו תומך בפסיקה של בתי המשפט לתעבורה.",
    ]),

    h2("אודות המפתח"),
    p(t("Guy Zomer, עורך דין ומפתח תוכנה.")),
    p(t("יצירת קשר: "), tl("guy@z-g.co.il", "mailto:guy@z-g.co.il")),

    h2("קישורים"),
    ul(
      li(tl("מדיניות פרטיות", "/case-tracker/privacy")),
      li(tl("תנאי שימוש", "/case-tracker/terms")),
    ),
  ]};
}

/* ── Privacy page ── */
function buildPrivacyPage() {
  return { type: "doc", content: [
    p(t("עדכון אחרון: אפריל 2026")),

    h2("1. מהו התוסף ומה מטרתו"),
    p(t("התוסף \"איתור אסמכתאות משפטיות\" סורק דפי אינטרנט שהמשתמש/ת גולש/ת בהם, מזהה אזכורים של מספרי תיקים משפטיים ישראליים, ושולף ממאגר פסיקה חיצוני תקצירים של פסקי דין והחלטות שניתנו באותם תיקים. מטרתו היחידה היא לסייע לעורכי דין, חוקרים ואזרחים להבין את ההקשר המשפטי שבדף הנקרא.")),

    h2("2. אילו נתונים נאספים"),
    p(t("כאשר התוסף מזהה אסמכתאות משפטיות בדף, הוא שולח לשרת את הפרטים הבאים:")),
    ul(
      li(tb("מספרי התיקים"), t(" שזוהו")),
      li(tb("קטע טקסט קצר"), t(" (כ-200 תווים) סביב כל אסמכתא, לצורך דירוג רלוונטיות בלבד")),
      li(tb("כתובת העמוד (URL)"), t(" שבו נמצאו האסמכתאות")),
      li(tb("כותרת העמוד")),
    ),
    p(t("התוסף "), tb("אינו"), t(" קורא או שולח: טפסים, סיסמאות, עוגיות, אימיילים, הודעות, מסמכים פתוחים, היסטוריית גלישה כללית, או מידע אישי מזהה של המשתמש/ת.")),

    h2("3. לאן נשלח המידע"),
    p(t("המידע נשלח לשירות "), tb("Tag-It"), t(" בכתובת tag-it.biz, המשמש כמאגר פסיקה ישראלי. חלק מהתקצירים מופקים באמצעות מודלי שפה גדולים (AI/LLM) בצד השרת של Tag-It. התוסף עצמו אינו שולח נתונים ישירות לספקי AI.")),

    h2("4. למה משמש המידע"),
    p(t("המידע משמש אך ורק לזיהוי מספרי תיקים, שליפת תקצירים, והצגתם למשתמש/ת. המידע אינו משמש לפרסום, לשיווק, למעקב, או לכל מטרה אחרת.")),

    h2("5. אימות משתמש"),
    p(t("התוסף מאפשר התחברות באמצעות חשבון Google, לצורך הזדהות מול שירות Tag-It. פרטי ההתחברות נשמרים מקומית בדפדפן בלבד.")),

    h2("6. שמירה ומחיקה"),
    p(t("תקצירים שנשלפו נשמרים במטמון מקומי בדפדפן למשך 24 שעות. ניתן לנקות את המטמון בכל עת דרך התוסף.")),

    h2("7. שקיפות מלאה"),
    p(t("התוסף כולל לשונית \"אודות\" עם יומן שקיפות מלא המציג את כל הבקשות שנשלחו ואת התגובות שהתקבלו.")),

    h2("8. יצירת קשר"),
    p(t("לשאלות בנוגע לפרטיות: "), tl("guy@z-g.co.il", "mailto:guy@z-g.co.il")),

    hr(),

    h2("Privacy Policy"),
    p(t("Last updated: April 2026")),
    h3("1. Purpose"),
    p(t("The extension scans web pages, identifies Israeli court case references, and retrieves case summaries from the Tag-It legal database.")),
    h3("2. Data Collected"),
    p(t("Case numbers, short text snippets (~200 chars), page URL, and page title. The extension does NOT read forms, passwords, cookies, emails, or browsing history.")),
    h3("3. Where Data Is Sent"),
    p(t("Data is sent to Tag-It (tag-it.biz). Some summaries are AI-generated server-side. The extension does not send data directly to AI providers.")),
    h3("4. Data Usage"),
    p(t("Data is used solely for the extension's purpose. Not used for advertising, marketing, profiling, or any unrelated purpose.")),
    h3("5. Contact"),
    p(t("For privacy questions: "), tl("guy@z-g.co.il", "mailto:guy@z-g.co.il")),
  ]};
}

/* ── Terms page ── */
function buildTermsPage() {
  return { type: "doc", content: [
    p(t("עדכון אחרון: אפריל 2026")),

    h2("קבלת התנאים"),
    p(t("בהתקנה ובשימוש בתוסף \"איתור אסמכתאות משפטיות\" (להלן: \"התוסף\"), אתם ואתן מסכימים לתנאי שימוש אלה.")),

    h2("תיאור השירות"),
    p(t("התוסף הוא כלי חינמי לדפדפן Chrome המזהה אזכורים של מספרי תיקים משפטיים ישראליים בדפי אינטרנט ושולף תקצירי פסיקה ממאגר Tag-It.")),

    h2("פרטיות"),
    p(t("התוסף שולח לשרת רק מספרי תיקים, קטעי טקסט קצרים, כתובת ושם העמוד. לפרטים מלאים ראו את "), tl("מדיניות הפרטיות", "/case-tracker/privacy"), t(".")),

    h2("הסתייגויות"),
    ul(
      li(t("התקצירים מבוססים בחלקם על מודלי שפה (AI) ועלולים לכלול טעויות.")),
      li(t("אין להסתמך על התקצירים כתחליף לקריאת פסק הדין המקורי.")),
      li(t("לגבי תיקים שקדמו ל-2010, ייתכנו אי-התאמות בזיהוי.")),
    ),

    h2("הגבלת אחריות"),
    p(t("התוסף מסופק \"כמות שהוא\" (AS IS), ללא אחריות מכל סוג. המפתח אינו אחראי לנזק כלשהו שייגרם משימוש בתוסף או מהסתמכות על התקצירים.")),

    h2("שינויים בתנאים"),
    p(t("תנאים אלה עשויים להתעדכן. שימוש מתמשך לאחר עדכון מהווה הסכמה לתנאים המעודכנים.")),

    h2("יצירת קשר"),
    p(t("לשאלות: "), tl("guy@z-g.co.il", "mailto:guy@z-g.co.il")),

    hr(),

    h2("Terms of Service"),
    p(t("Last updated: April 2026")),
    h3("Acceptance"),
    p(t("By installing and using the extension, you agree to these Terms.")),
    h3("Description"),
    p(t("A free Chrome extension that identifies Israeli court case references and retrieves summaries from the Tag-It legal database.")),
    h3("Disclaimers"),
    p(t("Summaries are partially AI-generated and may contain errors. Do not rely on them as a substitute for reading the original ruling. Pre-2010 cases may have identification issues.")),
    h3("Limitation of Liability"),
    p(t("The extension is provided AS IS, without warranty. The developer is not liable for any damages.")),
    h3("Contact"),
    p(t("For questions: "), tl("guy@z-g.co.il", "mailto:guy@z-g.co.il")),
  ]};
}

async function main() {
  const pages = [
    { slug: "case-tracker", title: "איתור אסמכתאות משפטיות (ראשי)", doc: buildMainPage() },
    { slug: "case-tracker-privacy", title: "איתור אסמכתאות — פרטיות", doc: buildPrivacyPage() },
    { slug: "case-tracker-terms", title: "איתור אסמכתאות — תנאי שימוש", doc: buildTermsPage() },
  ];

  for (const { slug, title, doc } of pages) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
      await prisma.page.update({ where: { slug }, data: { content: doc, draftContent: doc } });
      console.log(`Updated: ${slug}`);
    } else {
      await prisma.page.create({
        data: { slug, title, content: doc, draftContent: doc, status: "PUBLISHED", publishedAt: new Date() },
      });
      console.log(`Created: ${slug}`);
    }
  }

  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });
