/**
 * Updates the published post /haplilist/real-estate-deals-open after the Tax
 * Authority blocked open access (29.9.2026), through the plilist:edit API.
 *
 * It does NOT replace the post with a stored copy: it reads the live version
 * (which the owner edited by hand after publishing) and makes three targeted
 * changes, refusing to save if any anchor text is missing:
 *   1. an "update" line at the very top;
 *   2. repairs the sentence the hand edit broke in the second paragraph;
 *   3. a new section "ואז הגיעה החסימה" after the "בניתם משהו מעל המאגר?" line.
 * Running it twice is refused (the new heading is already there). The API
 * keeps the replaced version in plilist_revisions.
 *
 *   npx tsx scripts/update-real-estate-deals-post-blocking.ts          # dry run
 *   npx tsx scripts/update-real-estate-deals-post-blocking.ts --write
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "real-estate-deals-open";
const NEW_HEADING = "ואז הגיעה החסימה";

const SRC = {
  tmBlocked:
    "https://www.themarker.com/realestate/2026-09-29/ty-article/.premium/000001a0-edd1-d259-a3b4-edd921890000",
  globes: "https://www.globes.co.il/news/article.aspx?did=1001557987",
  zman: "https://www.zman.co.il/728462/",
  ice: "https://www.ice.co.il/realestate/news/article/1131665",
};

/* ─────────────────────────── TipTap helpers ─────────────────────────── */

type Part = string | { text: string; href: string } | { text: string; bold: true };
type Node = { type: string; content?: Node[]; text?: string; marks?: unknown[]; attrs?: Record<string, unknown> };

const a = (text: string, href: string): Part => ({ text, href });
const b = (text: string): Part => ({ text, bold: true });

function textNode(part: Part): Node {
  if (typeof part === "string") return { type: "text", text: part };
  if ("href" in part) {
    return { type: "text", text: part.text, marks: [{ type: "link", attrs: { href: part.href, target: "_blank" } }] };
  }
  return { type: "text", text: part.text, marks: [{ type: "bold" }] };
}

const p = (...parts: Part[]): Node => ({ type: "paragraph", content: parts.map(textNode) });
const h2 = (text: string): Node => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const quote = (text: string): Node => ({ type: "blockquote", content: [p(text)] });

const plain = (n: Node): string => (n.text ?? "") + (n.content ?? []).map(plain).join("");

/* ───────────────────────────── The changes ───────────────────────────── */

const UPDATE_LINE = p(
  b("עדכון, 30.9.2026: "),
  "ימים אחרי הפרסום, רשות המסים חסמה את הגישה הפתוחה למערכת שממנה נאסף המאגר. הפרטים בפרק ",
  b(NEW_HEADING),
  ".",
);

const BROKEN = "ובעקבותיו גם של שימושים החלו לצוץ";
const FIXED = "ובעקבותיו החלו לצוץ שימושים";

const SECTION: Node[] = [
  h2(NEW_HEADING),
  p(
    `יומיים אחרי הכתבה ב-TheMarker, רשות המסים `,
    a("סגרה את הכניסה הפתוחה", SRC.tmBlocked),
    ` למערכת "מאגר מידע נדל"ן" שלה. מי שנכנס אליה מופנה עכשיו לעמוד "כניסה לשירותי הדיגיטל של רשות המסים", ונדרש להזין מספר זהות וקוד משתמש קבוע. המשמעות המעשית: אי אפשר להמשיך לעדכן את המאגר הפתוח. מה שכבר נאסף, 3.84 מיליון עסקאות עד אמצע ספטמבר 2026, נשאר פתוח בגרסאות לעם.`,
  ),
  p(
    `הרשות מסרה ל-TheMarker שהיא לא חסמה את הגישה למידע, אלא מאפשרת רק "גישה אנושית, לאחר הזדהות", כדי למנוע הפרעה לשירות מצד כלי בינה מלאכותית. כלומר: המידע ציבורי, בתנאי שקוראים אותו עסקה אחרי עסקה. זו בדיוק המגבלה שבה פתחתי את הפוסט הזה.`,
  ),
  quote(
    "במקום להתיישר עם החלטת הממשלה מ-2016 ולהבין שהעולם השתנה, רשות המסים בוחרת היום לנסות ולחסום עוד יותר את הציבור משימוש במידע ששייך לו לפי חוק. המידע הציבורי לא שייך לרשות המסים, היא מחזיקה בו בנאמנות עבור הציבור. אחרי שראינו בתוך ימים כמה שימושים, כלים ויוזמות נוצרו ברגע שהמידע נפתח, התשובה של הרשות צריכה להיות לפתוח אותו בצורה טובה ורחבה יותר, לא לנסות לחסום אותי.",
  ),
  p(
    `אתר הנדל"ן הממשלתי השני, nadlan.gov.il, עדיין פתוח בלי הזדהות. אבל כפי ש`,
    a("גלובס", SRC.globes),
    ` דיווח, שני האתרים לא מציגים את אותו מידע: בבדיקה שערכנו על עשר חלקות אקראיות, שבע עסקאות שמופיעות במאגר רשות המסים לא מופיעות באתר הנדל"ן הממשלתי, וגם בעסקאות שמופיעות בשניהם יש סכומים שונים. מה שנשאר פתוח הוא מידע חלקי.`,
  ),
  p(
    `ובינתיים, המאגר כבר עושה את מה שמאגר פתוח אמור לעשות. עיתונאים התחילו לעבוד איתו: `,
    a("זמן ישראל", SRC.zman),
    ` ניתח באמצעותו את הפער בין מחירי הדירות להון העצמי של הקונים, ו-`,
    a("ice", SRC.ice),
    ` בחן את שוק הדיור בתל אביב, שבו מספר העסקאות יורד והמחיר החציוני עולה.`,
  ),
  p("אעדכן כאן מה הלאה."),
];

/* ──────────────────────────────── Runner ──────────────────────────────── */

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const url = `${SITE}/api/v1/plilist/${SLUG}/edit`;
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
  const post = (await res.json()) as { content: Node; updatedAt: string; status: string };
  const blocks = [...(post.content.content ?? [])];

  if (blocks.some((n) => n.type === "heading" && plain(n) === NEW_HEADING)) {
    throw new Error("already updated (the new heading is there); nothing to do.");
  }

  // 2. the broken sentence — must be inside a single text node.
  let fixed = 0;
  const repair = (n: Node) => {
    if (typeof n.text === "string" && n.text.includes(BROKEN)) {
      n.text = n.text.replace(BROKEN, FIXED);
      fixed++;
    }
    n.content?.forEach(repair);
  };
  blocks.forEach(repair);
  if (fixed !== 1) throw new Error(`expected the broken sentence once, found ${fixed}`);

  // 3. the new section, after the "בניתם משהו מעל המאגר?" paragraph.
  const anchor = blocks.findIndex((n) => n.type === "paragraph" && plain(n).startsWith("בניתם משהו מעל המאגר?"));
  if (anchor === -1) throw new Error('anchor paragraph "בניתם משהו מעל המאגר?" not found');
  blocks.splice(anchor + 1, 0, ...SECTION);

  // 1. the update line on top.
  blocks.unshift(UPDATE_LINE);

  const content = { ...post.content, content: blocks };
  console.log(`status ${post.status}, ${post.content.content?.length} → ${blocks.length} blocks, sentence fixed, section after block ${anchor}`);

  if (!process.argv.includes("--write")) {
    console.log("dry run — pass --write to save.");
    return;
  }

  const put = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ baseUpdatedAt: post.updatedAt, content }),
  });
  console.log(put.status, await put.text());
  if (!put.ok) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
