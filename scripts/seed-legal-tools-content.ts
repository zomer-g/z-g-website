import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/* ── TipTap helpers ── */
function t(text: string) { return { type: "text", text }; }
function tb(text: string) { return { type: "text", text, marks: [{ type: "bold" }] }; }
function tl(text: string, href: string) { return { type: "text", text, marks: [{ type: "link", attrs: { href } }] }; }
function h2(text: string) { return { type: "heading", attrs: { level: 2 }, content: [t(text)] }; }
function h3(text: string) { return { type: "heading", attrs: { level: 3 }, content: [t(text)] }; }
function p(...nodes: unknown[]) { return { type: "paragraph", content: nodes }; }
function li(...nodes: unknown[]) { return { type: "listItem", content: [p(...nodes)] }; }
function ul(...items: unknown[]) { return { type: "bulletList", content: items }; }
function hr() { return { type: "horizontalRule" }; }

/* ── Main page ── */
function buildMainPage() {
  return { type: "doc", content: [
    h2("יכולות התוסף"),
    ul(
      li(tb("ניהול ישויות משפטיות"), t(" — הגדרת צדדים, חוקים ומוסדות עם כינויים ואזכור ראשון אוטומטי")),
      li(tb("ניהול נספחים"), t(" — מספור אוטומטי לפי סדר הופעה במסמך")),
      li(tb("הערות שוליים"), t(" — בפורמט ציטוט משפטי ישראלי")),
    ),
    h2("פרטיות ואבטחה"),
    p(t("אני, מפתח התוסף, אינני אוסף, שולח או מאחסן שום מידע של משתמשי התוסף. כל הקוד רץ בסביבת Google Apps Script™ של המשתמש. קוד המקור פתוח לעיון.")),
    h2("אודות המפתח"),
    p(t("Guy Zomer — עורך דין ומפתח תוכנה.")),
    p(t("יצירת קשר: "), tl("zomerg@gmail.com", "mailto:zomerg@gmail.com")),
    h2("קישורים"),
    ul(
      li(tl("מדיניות פרטיות", "/legal-tools/privacy")),
      li(tl("תנאי שימוש", "/legal-tools/terms")),
      li(tl("תמיכה", "/legal-tools/support")),
      li(tl("קוד מקור (GitHub)", "https://github.com/zomer-g/legal-tools-addon")),
    ),
    p(t("Google Docs™ ו-Google Apps Script™ הם סימנים מסחריים של Google LLC.")),
  ]};
}

/* ── Privacy page ── */
function buildPrivacyPage() {
  return { type: "doc", content: [
    p(t("עדכון אחרון: אפריל 2026")),
    h2("מהו התוסף"),
    p(t("כלים משפטיים הוא תוסף ל-Google Docs™ המיועד לעורכי דין. התוסף מסייע בניהול ישויות משפטיות, נספחים והערות שוליים במסמכים משפטיים.")),
    h2("איסוף מידע"),
    p(tb("אני, מפתח התוסף, אינני אוסף, שולח, מאחסן או משתף שום מידע של משתמשי התוסף.")),
    ul(
      li(t("כל הקוד רץ באופן מקומי בסביבת Google Apps Script™, בתוך חשבון Google של המשתמש.")),
      li(t("התוסף ניגש אך ורק למסמך הפתוח הנוכחי.")),
      li(t("אין שרתים חיצוניים, אין קריאות רשת, אין צדדים שלישיים.")),
      li(t("הנתונים (ישויות, נספחים, הערות שוליים) נשמרים כ-Document Properties בתוך המסמך עצמו — ונשארים בבעלות המשתמש בלבד.")),
    ),
    h2("קוד מקור"),
    p(t("קוד המקור של התוסף פתוח וזמין לעיון ב-"), tl("GitHub", "https://github.com/zomer-g/legal-tools-addon"), t(".")),
    h2("הרשאות"),
    p(t("התוסף מבקש שתי הרשאות בלבד:")),
    ul(
      li(tb("גישה למסמך הנוכחי בלבד"), t(" — לקריאה ועריכת תוכן המסמך.")),
      li(tb("הצגת ממשק משתמש"), t(" — להצגת סרגל הצד והתפריט.")),
    ),
    h2("יצירת קשר"),
    p(t("לשאלות בנוגע לפרטיות: "), tl("zomerg@gmail.com", "mailto:zomerg@gmail.com")),
    p(t("Google Docs™ ו-Google Apps Script™ הם סימנים מסחריים של Google LLC.")),
    hr(),
    h2("Privacy Policy — Legal Tools"),
    p(t("Last updated: April 2026")),
    h3("What is this add-on"),
    p(t("Legal Tools is a Google Docs™ add-on designed for attorneys. It helps manage legal entities, appendices, and footnotes in legal documents.")),
    h3("Data Collection"),
    p(tb("I, the developer of this add-on, do not collect, transmit, store, or share any user data whatsoever.")),
    ul(
      li(t("All code runs locally within Google Apps Script™, inside the user's own Google account.")),
      li(t("The add-on only accesses the currently open document.")),
      li(t("There are no external servers, no network calls, no third parties.")),
      li(t("Data (entities, appendices, footnotes) is stored as Document Properties within the document itself — fully owned by the user.")),
    ),
    h3("Source Code"),
    p(t("The source code of this add-on is open and available for review on "), tl("GitHub", "https://github.com/zomer-g/legal-tools-addon"), t(".")),
    h3("Permissions"),
    p(t("The add-on requests only two permissions:")),
    ul(
      li(tb("Access to the current document only"), t(" — to read and edit document content.")),
      li(tb("Display user interface"), t(" — to show the sidebar and menu.")),
    ),
    h3("Contact"),
    p(t("For privacy questions: "), tl("zomerg@gmail.com", "mailto:zomerg@gmail.com")),
    p(t("Google Docs™ and Google Apps Script™ are trademarks of Google LLC.")),
  ]};
}

/* ── Terms page ── */
function buildTermsPage() {
  return { type: "doc", content: [
    p(t("עדכון אחרון: אפריל 2026")),
    h2("קבלת התנאים"),
    p(t("בהתקנה ובשימוש בתוסף \"כלים משפטיים\" (להלן: \"התוסף\"), אתם מסכימים לתנאי שימוש אלה.")),
    h2("תיאור השירות"),
    p(t("התוסף הוא כלי חינמי ל-Google Docs™ המסייע בניהול ישויות משפטיות, נספחים והערות שוליים. התוסף פועל באופן מקומי בתוך סביבת Google Apps Script™ של המשתמש.")),
    h2("פרטיות"),
    p(t("התוסף אינו אוסף מידע. לפרטים מלאים ראו את "), tl("מדיניות הפרטיות", "/legal-tools/privacy"), t(".")),
    h2("קוד מקור"),
    p(t("קוד המקור פתוח וזמין ב-"), tl("GitHub", "https://github.com/zomer-g/legal-tools-addon"), t(".")),
    h2("הגבלת אחריות"),
    p(t("התוסף מסופק \"כמות שהוא\" (AS IS), ללא אחריות מכל סוג. המפתח אינו אחראי לנזק כלשהו שייגרם משימוש בתוסף.")),
    h2("שינויים בתנאים"),
    p(t("תנאים אלה עשויים להתעדכן. שימוש מתמשך לאחר עדכון מהווה הסכמה לתנאים המעודכנים.")),
    h2("יצירת קשר"),
    p(t("לשאלות: "), tl("zomerg@gmail.com", "mailto:zomerg@gmail.com")),
    hr(),
    h2("Terms of Service — Legal Tools"),
    p(t("Last updated: April 2026")),
    h3("Acceptance"),
    p(t("By installing and using the \"Legal Tools\" add-on (the \"Add-on\"), you agree to these Terms of Service.")),
    h3("Description"),
    p(t("The Add-on is a free tool for Google Docs™ that helps manage legal entities, appendices, and footnotes. It runs locally within the user's Google Apps Script™ environment.")),
    h3("Privacy"),
    p(t("The Add-on does not collect any data. See our "), tl("Privacy Policy", "/legal-tools/privacy"), t(" for details.")),
    h3("Source Code"),
    p(t("The source code is open and available on "), tl("GitHub", "https://github.com/zomer-g/legal-tools-addon"), t(".")),
    h3("Disclaimer"),
    p(t("The Add-on is provided \"AS IS\", without warranty of any kind. The developer is not liable for any damages resulting from use of the Add-on.")),
    h3("Changes"),
    p(t("These terms may be updated. Continued use after updates constitutes acceptance of the new terms.")),
    h3("Contact"),
    p(t("For questions: "), tl("zomerg@gmail.com", "mailto:zomerg@gmail.com")),
  ]};
}

/* ── Support page ── */
function buildSupportPage() {
  return { type: "doc", content: [
    h2("יצירת קשר"),
    p(t("לכל שאלה או בעיה: "), tl("zomerg@gmail.com", "mailto:zomerg@gmail.com")),
    h2("דיווח על באגים"),
    p(t("ניתן לדווח על באגים דרך "), tl("GitHub Issues", "https://github.com/zomer-g/legal-tools-addon/issues"), t(".")),
    h2("שאלות נפוצות"),
    h3("האם התוסף חינמי?"),
    p(t("כן, התוסף חינמי לחלוטין.")),
    h3("האם התוסף אוסף מידע?"),
    p(t("לא. ראו "), tl("מדיניות פרטיות", "/legal-tools/privacy"), t(".")),
    h3("האם קוד המקור פתוח?"),
    p(t("כן, הקוד זמין ב-"), tl("GitHub", "https://github.com/zomer-g/legal-tools-addon"), t(".")),
    hr(),
    h2("Support — Legal Tools"),
    h3("Contact"),
    p(t("For any questions or issues: "), tl("zomerg@gmail.com", "mailto:zomerg@gmail.com")),
    h3("Bug Reports"),
    p(t("Report bugs via "), tl("GitHub Issues", "https://github.com/zomer-g/legal-tools-addon/issues"), t(".")),
    h3("FAQ"),
    p(tb("Is the add-on free?")),
    p(t("Yes, completely free.")),
    p(tb("Does the add-on collect data?")),
    p(t("No. See our "), tl("Privacy Policy", "/legal-tools/privacy"), t(".")),
    p(tb("Is the source code open?")),
    p(t("Yes, available on "), tl("GitHub", "https://github.com/zomer-g/legal-tools-addon"), t(".")),
  ]};
}

/* ── Main ── */
async function main() {
  const pages = [
    { slug: "legal-tools", doc: buildMainPage() },
    { slug: "legal-tools-privacy", doc: buildPrivacyPage() },
    { slug: "legal-tools-terms", doc: buildTermsPage() },
    { slug: "legal-tools-support", doc: buildSupportPage() },
  ];

  for (const { slug, doc } of pages) {
    await prisma.page.update({
      where: { slug },
      data: { content: doc, draftContent: doc },
    });
    console.log(`Updated: ${slug}`);
  }

  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => { console.error(e); process.exit(1); });
