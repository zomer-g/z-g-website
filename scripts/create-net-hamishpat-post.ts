/**
 * הפליליסט draft: the state of Net HaMishpat (נט המשפט), October 2026.
 * Numbers are from the public פח המשפט reports API (/api/pach-hamishpat/reports),
 * pulled 21.10.2026. DRAFT only — the owner reviews before publishing.
 * plilist:draft API; idempotent (upsert by slug, stays a draft).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "net-hamishpat-broken";
const PACH = "/pach-hamishpat";

type Part = string | { text: string; href: string } | { text: string; bold: true };
const a = (text: string, href: string): Part => ({ text, href });
const b = (text: string): Part => ({ text, bold: true });
function textNode(part: Part) {
  if (typeof part === "string") return { type: "text", text: part };
  if ("href" in part) return { type: "text", text: part.text, marks: [{ type: "link", attrs: { href: part.href, target: "_blank" } }] };
  return { type: "text", text: part.text, marks: [{ type: "bold" }] };
}
const p = (...parts: Part[]) => ({ type: "paragraph", content: parts.map(textNode) });
const h2 = (text: string) => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const ul = (items: Part[][]) => ({
  type: "bulletList",
  content: items.map((parts) => ({ type: "listItem", content: [p(...parts)] })),
});

const TITLE = "נט המשפט: מערכת שאי אפשר לסמוך עליה";
const EXCERPT =
  "כבר שבועות נט המשפט קורס, נתקע ונעלם, דווקא ברגעים שבהם צריך אותו. בהליך משפטי אין \"ננסה מחר\": יש מועדים, יש דיונים, ויש אנשים שמחכים. ובהנהלת בתי המשפט, כך נראה, אף אחד לא מתרגש.";

const content = {
  type: "doc",
  content: [
    p(b(EXCERPT)),

    h2("שבועיים של תקלות"),

    p(
      `מי שעובד מול בתי המשפט מכיר את הרגע: צריך להגיש בקשה, לבדוק החלטה שניתנה הבוקר, להוריד פרוטוקול לפני דיון. נכנסים לנט המשפט, והוא לא עונה. או שעונה, ונתקע באמצע ההגשה. או שמציג שגיאה, ואחרי רבע שעה עוד אחת.`,
    ),

    p(
      `באתר `,
      a("פח המשפט", PACH),
      ` עורכי דין ומשתמשים מדווחים בזמן אמת כשהמערכת לא עובדת. בשלושים הימים האחרונים התקבלו שם 36 דיווחים על תקלה, ב-14 ימים שונים. רק באוקטובר, עד ה-21 בחודש, התקבלו 29 דיווחים, יותר מבכל חודש מאז דצמבר 2025. וזה רק מה שמישהו טרח לדווח. רוב מי שנתקל בתקלה פשוט מנסה שוב, מקלל ומחכה.`,
    ),

    h2("למה זה לא \"סתם אתר שנפל\""),

    p(
      `כשאתר של חנות נופל, הקונה יחזור מחר. בהליך משפטי אין מחר. הליכים מתנהלים בקצב מהיר, והרבה פעמים הצורך במערכת הוא מיידי:`,
    ),

    ul([
      [b("מועדים. "), "מועד להגשת ערעור, תגובה או בקשה לא זז בגלל שהשרת לא עונה. מי שמפספס אותו צריך להתחנן להארכה, להסביר, ולקוות."],
      [b("הליכים דחופים. "), "בקשה להארכת מעצר, צו מניעה, עיכוב ביצוע: דברים שמוגשים ונדונים בתוך שעות. כשהמערכת לא זמינה, השעות האלה נשרפות."],
      [b("הכנה לדיון. "), "החלטה שניתנה בבוקר, תגובה שהוגשה בלילה, פרוטוקול של הדיון הקודם. בלי גישה אליהם, נכנסים לאולם בלי לדעת מה מונח על השולחן."],
      [b("זמן ציבורי וזמן של לקוחות. "), "כל שעה של עורך דין שיושב ומרענן דף שגיאה היא שעה שמישהו משלם עליה: הלקוח, המדינה, או עורך הדין עצמו."],
    ]),

    p(
      `ומעל הכול: מערכת שאי אפשר לסמוך עליה מאלצת לעבוד כאילו היא לא קיימת. להגיש ימים מראש, לשמור עותקים בצד, לבנות כלים עוקפים. זה בדיוק הפוך ממה שמערכת דיגיטלית אמורה לעשות.`,
    ),

    h2("ולאף אחד לא אכפת"),

    p(
      `הדבר המקומם ביותר הוא לא התקלות עצמן. תקלות קורות בכל מערכת. המקומם הוא השקט. אין דף סטטוס רשמי שמודיע שהמערכת למטה. אין הודעה מסודרת כשתקלה מתחילה ואין כשהיא נגמרת. אין דוח שמסביר מה קרה ומה עושים כדי שזה לא יחזור. מי שרוצה לדעת אם הבעיה אצלו או אצל בתי המשפט, צריך לשאול בקבוצות ווטסאפ, או להיכנס לאתר שעורכי דין הקימו בעצמם.`,
    ),

    p(
      `נט המשפט היא לא תוכנה שמישהו בחר להשתמש בה. היא הדרך היחידה לנהל תיק. עורכי דין ובעלי דין חייבים לעבוד דרכה, ואין להם חלופה. גוף שמחזיק במונופול כזה חייב לנהוג באחריות של מונופול. בפועל, ההתנהלות של הנהלת בתי המשפט מול התקלות משדרת שזה פשוט לא בראש סדר העדיפויות.`,
    ),

    h2("מה צריך לקרות"),

    ul([
      [b("דף סטטוס רשמי ושקוף, "), "שמראה בזמן אמת אם המערכת תקינה, ושומר היסטוריה של תקלות."],
      [b("הודעה על כל תקלה, "), "כשהיא מתחילה וכשהיא נפתרת, בערוצים שעורכי הדין באמת קוראים."],
      [b("הגנה על מועדים, "), "כך שמי שלא הצליח להגיש בגלל תקלה מתועדת לא ייפגע, בלי שיצטרך לבקש ולהתחנן."],
      [b("דוח אחרי כל תקלה משמעותית: "), "מה קרה, כמה זמן זה נמשך ומה ישתנה."],
    ]),

    p(
      `עד שזה יקרה, `,
      a("פח המשפט", PACH),
      ` ימשיך לתעד. אם נתקלתם בתקלה, דווחו שם. כל דיווח הוא עוד נתון שקשה להתעלם ממנו.`,
    ),
  ],
};

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set.");
  const res = await fetch(`${SITE}/api/v1/plilist/${SLUG}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: TITLE,
      content,
      excerpt: EXCERPT,
      seoTitle: TITLE,
      seoDesc: EXCERPT,
      tags: ["נט המשפט", "הנהלת בתי המשפט", "פח המשפט", "טכנולוגיה ומשפט"],
    }),
  });
  console.log(res.status, await res.text());
  if (!res.ok) process.exit(1);
}

main();
