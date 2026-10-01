/**
 * Adds the legislation the court-file inspection article relies on
 * (/articles/court-file-inspection-rights) above its case-law list, and
 * updates the line about the FOI law for regulation 7(ב) (2022 amendment).
 *
 * Works through the write API: GET the live content, edit it, PUT it back
 * with the updatedAt it read, so an edit made in the admin editor meanwhile
 * is never overwritten. Idempotent — a second run changes nothing.
 *
 * Needs ZG_API_KEY with scope articles:edit (from /admin/api-keys), in the
 * environment or the gitignored .env.local. --dry prints the result only.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "court-file-inspection-rights";
const DRY = process.argv.includes("--dry");

/* ─── Sources (verbatim from he.wikisource.org, 1.10.2026) ─── */

const WS = "https://he.wikisource.org/wiki/";
const BASIC_LAW = `${WS}%D7%97%D7%95%D7%A7-%D7%99%D7%A1%D7%95%D7%93%3A%20%D7%94%D7%A9%D7%A4%D7%99%D7%98%D7%94`;
const COURTS_LAW = `${WS}%D7%97%D7%95%D7%A7%20%D7%91%D7%AA%D7%99%20%D7%94%D7%9E%D7%A9%D7%A4%D7%98`;
const REGS = `${WS}%D7%AA%D7%A7%D7%A0%D7%95%D7%AA%20%D7%91%D7%AA%D7%99%20%D7%94%D7%9E%D7%A9%D7%A4%D7%98%20%D7%95%D7%91%D7%AA%D7%99%20%D7%94%D7%93%D7%99%D7%9F%20%D7%9C%D7%A2%D7%91%D7%95%D7%93%D7%94%20%28%D7%A2%D7%99%D7%95%D7%9F%20%D7%91%D7%AA%D7%99%D7%A7%D7%99%D7%9D%29`;
const VICTIMS_LAW = `${WS}%D7%97%D7%95%D7%A7%20%D7%96%D7%9B%D7%95%D7%99%D7%95%D7%AA%20%D7%A0%D7%A4%D7%92%D7%A2%D7%99%20%D7%A2%D7%91%D7%99%D7%A8%D7%94`;
const section = (base: string, n: string) => `${base}#${encodeURIComponent(`סעיף_${n}`)}`;

const REGS_NAME = 'תקנות בתי המשפט ובתי הדין לעבודה (עיון בתיקים), התשס"ג-2003';

const GENERAL_LAW = [
  {
    lawName: "חוק-יסוד: השפיטה, סעיף 3 — פומביות הדיון",
    quote: "בית משפט ידון בפומבי, זולת אם נקבע אחרת בחוק או אם בית המשפט הורה אחרת לפי חוק.",
    url: section(BASIC_LAW, "3"),
  },
  {
    lawName: 'חוק בתי המשפט [נוסח משולב], התשמ"ד-1984, סעיף 68 — פומביות הדיון',
    quote:
      "(א) בית משפט ידון בפומבי.\n" +
      "(ב) בית משפט רשאי לדון בענין מסויים, כולו או מקצתו, בדלתיים סגורות, אם ראה צורך בכך באחת מאלה: ...\n" +
      "(ד) החליט בית משפט על עריכת דיון בדלתיים סגורות, רשאי הוא להרשות לאדם או לסוגי בני אדם להיות נוכחים בעת הדיון כולו או מקצתו...",
    url: section(COURTS_LAW, "68"),
  },
  {
    lawName: `${REGS_NAME}, תקנה 1 — הגדרות (מתוך)`,
    quote:
      "”עיון“ – לרבות צפיה, האזנה, העתקה, צילום, הדפסה, הקלטה, קבלת פלט מחשב או קבלת עותק של מסמך בכל דרך אחרת, בהתאם לסוג המידע וצורת החזקתו;\n" +
      "”תיק בית משפט“ – תיק בית משפט, לרבות כל המסמכים והמוצגים שבו, הנמצא בבית המשפט שבו מתבקש העיון או בארכיבו.",
    url: section(REGS, "1"),
  },
  {
    lawName: `${REGS_NAME}, תקנה 3 — זכות עיון של בעלי הדין (מתוך)`,
    quote:
      "בעל דין רשאי, לאחר שמילא הודעת עיון לפי טופס 1 שבתוספת (להלן – הודעת עיון), לעיין בתיק בית המשפט שהוא צד בו, אלא אם כן הוא אסור לעיונו על פי דין...",
    url: section(REGS, "3"),
  },
  {
    lawName: `${REGS_NAME}, תקנה 4 — זכות העיון של מי שאינו בעל דין`,
    quote:
      "(א) כל אדם רשאי לבקש מבית משפט לעיין בתיק בית משפט (להלן – בקשת עיון), ובלבד שהעיון בו אינו אסור על פי דין.\n" +
      "(ב) בקשת עיון תוגש לשופט או רשם שהתיק נדון לפניו, ובאין אפשרות כאמור, לשופט או רשם שיקבע נשיא בית המשפט.\n" +
      "(ג) בקשת עיון תהיה מנומקת, ותוגש לפי טופס 2 שבתוספת.\n" +
      "(ד) בבואו לשקול בקשת עיון, ייתן בית המשפט את דעתו, בין השאר, לענינו בתיק של המבקש, לענינם של בעלי הדין ושל מי שעלול להיפגע כתוצאה מהעיון, וכן לסבירות הקצאת המשאבים הנדרשת לשם היענות לבקשה.\n" +
      "(ה) בית המשפט רשאי להורות על העברת בקשת העיון לתגובת בעלי הדין בתיק שמבוקש בו העיון או לתגובת צד שלישי, אם הוא סבור כי העיון עלול לפגוע במי מהם, וכן רשאי בית המשפט לבקש את תגובת היועץ המשפטי לממשלה, אם הוא סבור כי העיון עלול לפגוע באינטרס ציבורי; תגובות כאמור בתקנת משנה זו יוגשו בתוך שלושים ימים ממועד המצאת ההודעה על זכות התגובה או בתוך מועד אחר שיקבע בית המשפט.\n" +
      "(ו) החליט בית המשפט להתיר את העיון, רשאי הוא לקבוע בהחלטתו כל תנאי או הסדר הדרושים כדי לאזן בין הצורך בעיון לבין הפגיעה אשר עלולה להיגרם לבעלי הדין או לצד שלישי בשל העיון, לרבות השמטת פרטים, הגבלת מספר המעיינים ונקיטת אמצעים למניעת זיהוים של בעלי דין או אנשים אחרים; בית המשפט רשאי להגביל את היקף העיון ולהתנותו בתנאים, אם ראה כי הקצאת המשאבים הנדרשת מחייבת זאת.\n" +
      "(ז) התיר בית המשפט עיון לפי תקנה זו, ימלא המבקש הודעת עיון כאמור בתקנה 3, טרם העיון.",
    url: section(REGS, "4"),
  },
  {
    lawName: `${REGS_NAME}, תקנה 7(ב) — עיון לפי התקנות בלבד (תיקון התשפ"ב)`,
    quote:
      "(ב) עיון במידע המצוי בתיק בית משפט יתאפשר לפי תקנות אלה בלבד, למעט מידע שנוצר בידי צד להליך שהוא רשות ציבורית כהגדרתה בחוק חופש המידע, התשנ״ח–1998, או בשבילו; לעניין זה, ”עיון“ – לרבות צפייה במידע באמצעות קבלתו.",
    url: section(REGS, "7"),
  },
];

const VICTIMS_ITEMS = [
  {
    lawName: 'חוק זכויות נפגעי עבירה, התשס"א-2001, סעיף 9 — זכות עיון בכתב אישום',
    quote:
      "נפגע עבירה זכאי, לבקשתו או לבקשת בא כוחו, לעיין בכתב האישום נגד הנאשם או בהסדר לסגירת תיק כאמור בסימן א׳1 בפרק ד׳ לחוק סדר הדין הפלילי, לפי העניין, ולקבל העתק ממנו, אלא אם כן התקיים אחד מאלה:\n" +
      "(1) עיון כאמור בכתב האישום או בהסדר לסגירת תיק – אסור על פי דין;\n" +
      "(2) סבר פרקליט המחוז או ראש יחידת התביעות במשטרה, לפי הענין, כי מטעמים מיוחדים שיירשמו אין להרשות את העיון או את קבלת ההעתק כאמור.",
    url: section(VICTIMS_LAW, "9"),
  },
  {
    lawName: 'חוק זכויות נפגעי עבירה, התשס"א-2001, סעיף 15 — זכות לנוכחות בדיון הנערך בדלתיים סגורות',
    quote:
      "(א) בכפוף להוראות סעיף 172 לחוק סדר הדין הפלילי, נפגע עבירה זכאי להיות נוכח בדיון בבית המשפט בענין העבירה שממנה נפגע, הנערך בדלתיים סגורות לפי סעיף 68 לחוק בתי המשפט [נוסח משולב], התשמ״ד–1984, וכן זכאי הוא שאדם המלווה אותו, לפי בחירתו, יהיה נוכח עמו בדיון כאמור.\n" +
      "(ב) על אף הוראות סעיף קטן (א) רשאי בית המשפט, מטעמים מיוחדים שיירשמו, שלא לאפשר את נוכחותו של נפגע העבירה או של האדם המלווה אותו בדיון בבית המשפט.",
    url: section(VICTIMS_LAW, "15"),
  },
];

const DISCLAIMER = "נוסח הסעיפים מתוך ויקיטקסט (ספר החוקים הפתוח). הנוסח המחייב הוא הנוסח הרשמי ברשומות.";

/* ─── TipTap helpers ─── */

interface Node {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}
const t = (text: string): Node => ({ type: "text", text });
const tb = (text: string): Node => ({ type: "text", text, marks: [{ type: "bold" }] });
const tl = (text: string, href: string): Node => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href, target: "_blank" } }],
});
const p = (...nodes: Node[]): Node => ({ type: "paragraph", content: nodes });
const h2 = (text: string): Node => ({ type: "heading", attrs: { level: 2 }, content: [t(text)] });
const lawBlock = (title: string, items: typeof GENERAL_LAW): Node => ({
  type: "lawBlock",
  attrs: { icon: "BookOpen", title, disclaimer: DISCLAIMER, items: JSON.stringify(items) },
});
const textOf = (n: Node): string => (n.text ?? "") + (n.content ?? []).map(textOf).join("");

const LEGISLATION_HEADING = "החקיקה שעליה מבוסס המאמר";
const CASE_LAW_HEADING = "הפסיקה שעליה מבוסס המאמר";
const GLOBAL_GREEN_PDF = "/uploads/iyun-aam-3195-18-global-green.pdf";

function edit(doc: Node): { doc: Node; changes: string[] } {
  const changes: string[] = [];
  const blocks = [...(doc.content ?? [])];

  // 1. Legislation section right above the case-law list.
  if (!blocks.some((b) => b.type === "heading" && textOf(b) === LEGISLATION_HEADING)) {
    const at = blocks.findIndex((b) => b.type === "heading" && textOf(b) === CASE_LAW_HEADING);
    if (at === -1) throw new Error(`heading "${CASE_LAW_HEADING}" not found`);
    blocks.splice(
      at,
      0,
      h2(LEGISLATION_HEADING),
      p(t("ההוראות שעליהן נשען המאמר, בנוסחן ובקישור לנוסח המלא:")),
      lawBlock("פומביות הדיון ועיון בתיקי בית משפט", GENERAL_LAW),
      lawBlock("נפגעי עבירה", VICTIMS_ITEMS),
    );
    changes.push("added the legislation section");
  }

  // 2. The FOI line in "טענות שבתי המשפט דחו" — accurate after the 2022 amendment.
  for (const b of blocks) {
    if (b.type !== "infoBlock") continue;
    for (const row of b.content ?? []) {
      const s = textOf(row);
      if (s.startsWith("\"זה עוקף את חוק חופש המידע\"") && !s.includes("7(ב)")) {
        row.content = [
          tb("\"זה עוקף את חוק חופש המידע\""),
          t(". בית המשפט קבע שמדובר בשני מסלולים נפרדים ("),
          tl("עע\"מ 3195/18", GLOBAL_GREEN_PDF),
          t(", 2019). מאז תיקון 2022 (תקנה 7(ב)), מידע שבתיק בית משפט נבחן ככלל רק לפי תקנות העיון. מידע שיצרה רשות ציבורית שהיא צד להליך, או שנוצר בשבילה, אפשר לבקש גם לפי חוק חופש המידע."),
        ];
        changes.push("updated the FOI row");
      }
      // The same ruling in the closing case-law list.
      if (s.startsWith("עע\"מ 3195/18") && s.includes("מסלולים מקבילים") && !s.includes("2022")) {
        const last = row.content?.[row.content.length - 1];
        if (last?.type === "text") {
          last.text = ": תקנות העיון וחוק חופש המידע הם מסלולים מקבילים (לפני תיקון 2022 לתקנה 7(ב)).";
          changes.push("updated the case-law list row");
        }
      }
    }
  }

  return { doc: { ...doc, content: blocks }, changes };
}

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const res = await fetch(`${SITE}/api/v1/articles/${SLUG}`, { headers });
  if (!res.ok) throw new Error(`GET ${res.status}: ${await res.text()}`);
  const article = (await res.json()) as { content: Node; updatedAt: string; status: string };
  console.log(`read ${SLUG} (${article.status}, updated ${article.updatedAt})`);

  const { doc, changes } = edit(article.content);
  if (changes.length === 0) {
    console.log("nothing to change");
    return;
  }
  console.log("changes:", changes.join("; "));
  if (DRY) {
    console.log(JSON.stringify(doc, null, 1).slice(0, 4000));
    return;
  }

  const put = await fetch(`${SITE}/api/v1/articles/${SLUG}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ baseUpdatedAt: article.updatedAt, content: doc }),
  });
  console.log(`PUT ${put.status}: ${await put.text()}`);
  if (!put.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
