/**
 * Rewrites the /accessibility page content.
 *
 * The statement that was live described the site as meeting WCAG 2.1 at level
 * AAA, which was not true, and was missing four things תקנה 35 asks a service
 * provider to publish: which parts of the site are NOT accessible and why,
 * when the site was checked and by whom, the accessibility of the place where
 * clients are received, and a plainly worded way to report a problem.
 *
 * Written to be read by someone who is having trouble using the site, not by a
 * lawyer — short sentences, no jargon, and every claim is one that was
 * actually verified.
 *
 * Usage: npx tsx scripts/update-accessibility-statement.ts [--dry] [--backup <file>]
 * Env:   DATABASE_URL
 *
 * --backup writes the current row to a file before touching anything, so the
 * previous wording can always be put back.
 */
import "dotenv/config";
import fs from "node:fs";

type Node = Record<string, unknown>;

const p = (...content: Node[]): Node => ({ type: "paragraph", content });
const t = (text: string): Node => ({ type: "text", text });
const b = (text: string): Node => ({
  type: "text",
  text,
  marks: [{ type: "bold" }],
});
const link = (text: string, href: string): Node => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href } }],
});
const h = (level: number, text: string): Node => ({
  type: "heading",
  attrs: { level },
  content: [t(text)],
});
const ul = (...items: Node[][]): Node => ({
  type: "bulletList",
  content: items.map((content) => ({
    type: "listItem",
    content: [{ type: "paragraph", content }],
  })),
});

const doc: Node = {
  type: "doc",
  content: [
    h(2, "מה כתוב בעמוד הזה"),
    p(
      t(
        "האתר הזה בנוי כדי שאפשר יהיה להשתמש בו גם בלי עכבר, גם עם קורא מסך, וגם כשמגדילים את הטקסט. בעמוד הזה כתוב מה נעשה בפועל, מה עדיין לא נגיש, ואיך לפנות אליי אם משהו לא עובד.",
      ),
    ),

    h(2, "רמת הנגישות של האתר"),
    p(
      t("האתר עומד בתקן הישראלי "),
      b("ת״י 5568 ברמה AA"),
      t(
        " — זו הרמה שתקנות הנגישות מחייבות. בחלקים רבים באתר מיושמות גם דרישות מחמירות יותר, למשל יחס ניגודיות של 7:1 בכל הטקסטים ומחוון מיקוד מודגש.",
      ),
    ),
    p(
      t(
        "התקן הזה מבוסס על WCAG — אוסף כללים בין-לאומי שמגדיר איך לבנות אתר שאפשר להשתמש בו גם עם מוגבלות ראייה, שמיעה, מוטוריקה או קשב.",
      ),
    ),

    h(2, "מה עובד באתר"),
    ul(
      [
        b("ניווט מלא במקלדת"),
        t(" — אפשר להגיע לכל קישור, כפתור ושדה בלי עכבר, ותמיד רואים איפה נמצאים."),
      ],
      [
        b("דילוג לתוכן"),
        t(" — בתחילת כל עמוד יש קישור שמדלג ישר לתוכן, בלי לעבור על כל התפריט."),
      ],
      [
        b("תמיכה בקוראי מסך"),
        t(
          " — כותרות מסודרות, תווית לכל שדה בטופס, והכרזה על מספר התוצאות אחרי כל סינון.",
        ),
      ],
      [
        b("ניגודיות צבעים גבוהה"),
        t(" — כל הטקסטים באתר נבדקו ועומדים ביחס של 7:1 לפחות."),
      ],
      [
        b("הגדלת טקסט"),
        t(" — אפשר להגדיל את הטקסט בדפדפן בלי שהתוכן יישבר או ייחתך."),
      ],
      [
        b("פחות תנועה"),
        t(
          " — האתר מכבד את הגדרת ״הפחתת תנועה״ של מערכת ההפעלה, ובמפת זרימת המידע יש כפתור לעצירת האנימציה.",
        ),
      ],
      [
        b("קישורים שנפתחים בחלון חדש"),
        t(" — מודיעים על כך מראש לקורא המסך."),
      ],
      [b("עברית ומימין לשמאל"), t(" — בכל חלקי האתר.")],
    ),

    h(2, "מה עדיין לא נגיש"),
    p(
      t(
        "יש באתר חלקים שאינם נגישים במלואם. חשוב לי לומר את זה במפורש ולא להשאיר אתכם לגלות לבד:",
      ),
    ),
    ul(
      [
        b("מסמכים שמקורם בגופים אחרים"),
        t(
          " — פסקי דין, הנחיות ודוחות שמגיעים מבתי המשפט, מהפרקליטות וממשרדי ממשלה. הם מוצגים כפי שהתקבלו. חלקם קבצים סרוקים שקורא מסך אינו יכול להקריא, ואין לי שליטה על האופן שבו הם הופקו.",
        ),
      ],
      [
        b("מפת זרימת המידע"),
        t(
          " — דיאגרמה חזותית. אפשר לעבור בין הרכיבים במקלדת ולקרוא את הפרטים של כל אחד, אבל הקשרים המרחביים בין הרכיבים אינם נמסרים בצורה שאינה חזותית.",
        ),
      ],
      [
        b("עמודי הדגמת ממשק"),
        t(
          " — עמודים שמדגימים ממשקים לצורך המחשה בלבד. חלק מהאלמנטים בהם עדיין לא הונגשו במלואם.",
        ),
      ],
    ),
    p(
      b("נתקלתם באחד מאלה ואתם צריכים את המידע? "),
      t("כתבו לי ואשלח לכם אותו בפורמט נגיש, ללא עלות."),
    ),

    h(2, "איך האתר נבדק"),
    p(
      t(
        "באוגוסט 2026 נערכה באתר בדיקת נגישות מקיפה: סריקה אוטומטית של כל העמודים, חישוב יחס הניגודיות של כל טקסט באתר, ובדיקה ידנית של ניווט במקלדת ושל ההתנהגות מול קורא מסך. הליקויים שנמצאו תוקנו.",
      ),
    ),
    p(
      t(
        "הבדיקה נערכה על ידי מי שמפתח את האתר, ולא על ידי מורשה נגישות מוסמך. בדיקות נוספות נערכות מעת לעת וההצהרה מתעדכנת בהתאם.",
      ),
    ),

    h(2, "קבלת קהל"),
    p(
      t(
        "השירות ניתן מרחוק בלבד — בטלפון, באימייל ובשיחות וידאו. אין משרד שאליו צריך להגיע, ולכן אין הסדרי נגישות פיזיים שרלוונטיים כאן.",
      ),
    ),

    h(2, "משהו לא עובד? כתבו לי"),
    p(
      t(
        "אם נתקלתם בבעיה — קישור שאי אפשר להגיע אליו במקלדת, טקסט שקורא המסך מדלג עליו, צבע שקשה לקרוא, טופס שנתקע — אשמח לשמוע. גם הצעות לשיפור מתקבלות בברכה.",
      ),
    ),
    ul(
      [t("אימייל: "), link("guy@z-g.co.il", "mailto:guy@z-g.co.il")],
      [t("טלפון: "), link("054-7650202", "tel:+972547650202")],
    ),
    p(
      t("אשתדל להשיב לכל פנייה בנושא נגישות "),
      b("תוך 5 ימי עסקים"),
      t("."),
    ),

    h(2, "תאריך עדכון"),
    p(t("הצהרת הנגישות עודכנה לאחרונה באוגוסט 2026.")),
  ],
};

async function main() {
  const dry = process.argv.includes("--dry");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const { prisma } = await import("../src/lib/prisma");
  const existing = await prisma.page.findUnique({
    where: { slug: "accessibility" },
    select: { id: true, title: true, status: true, updatedAt: true },
  });
  if (!existing) throw new Error('no Page row with slug "accessibility"');

  console.log(
    `found page ${existing.id} — "${existing.title}" [${existing.status}], last updated ${existing.updatedAt.toISOString()}`,
  );

  const backupAt = process.argv.indexOf("--backup");
  if (backupAt !== -1 && process.argv[backupAt + 1]) {
    const full = await prisma.page.findUnique({ where: { slug: "accessibility" } });
    fs.writeFileSync(process.argv[backupAt + 1], JSON.stringify(full, null, 2));
    console.log(`backed up the current row to ${process.argv[backupAt + 1]}`);
  }

  const blocks = (doc.content as Node[]).length;
  if (dry) {
    console.log(`--dry: would write ${blocks} blocks. Nothing changed.`);
    console.log(JSON.stringify(doc, null, 2).slice(0, 600) + "\n…");
    return;
  }

  await prisma.page.update({
    where: { slug: "accessibility" },
    data: { content: doc as never, publishedAt: new Date() },
  });
  console.log(`updated: wrote ${blocks} blocks to /accessibility`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("update failed:", err);
    process.exit(1);
  });
