/**
 * Simi Spolter's TheMarker piece (6.10.2026): the Tax Authority's director,
 * Shai Aharonovich, speaks about the blocking of the real-estate register for
 * the first time — a temporary step, and a policy change under review:
 *   1. adds it to the publications list, tagged to the case;
 *   2. adds a paragraph to the post right after Ran Bar-Zik's paragraph on the
 *      "AI attacks" explanation (falls back to right after the Authority's
 *      response, "הרשות מסרה ל-TheMarker שהיא לא חסמה..."). plilist:edit API;
 *      reads the live post and patches it; refuses if already there.
 *
 *   npx tsx scripts/add-aharonovich-temporary-block-article.ts            # dry run
 *   npx tsx scripts/add-aharonovich-temporary-block-article.ts --write
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "real-estate-deals-open";
const URL_ARTICLE =
  "https://www.themarker.com/realestate/2026-10-06/ty-article/.premium/000001a1-1095-d371-a1fd-3adf9e340000";

const MEDIA = {
  url: URL_ARTICLE,
  title: "חסימת מאגר עסקות הנדל\"ן: מנהל רשות המסים אומר שהמהלך זמני והוא שוקל שינוי מדיניות",
  description:
    "מנהל רשות המסים, שי אהרונוביץ', התייחס לראשונה לחסימת מאגר עסקאות הנדל\"ן אחרי שנפתח לציבור בגרסאות לעם. לדבריו, היקף ההורדות יצר עומס כבד על מערכות הרשות, החסימה היא \"שלב ביניים בלבד\", והרשות בוחנת אם נדרש שינוי מדיניות כולל, ואולי גם חקיקה, ותכריע בשבועות הקרובים.",
  type: "article",
  source: "TheMarker",
  date: "2026-10-06",
  isActive: true,
  caseTag: "real-estate-deals",
};

type Node = { type: string; content?: Node[]; text?: string; marks?: unknown[] };
const t = (text: string): Node => ({ type: "text", text });
const link = (text: string, href: string): Node => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href, target: "_blank" } }],
});
const plain = (n: Node): string => (n.text ?? "") + (n.content ?? []).map(plain).join("");

const PARAGRAPH: Node = {
  type: "paragraph",
  content: [
    t("ב-6.10.2026 התייחס לראשונה מנהל רשות המסים, שי אהרונוביץ', לחסימה. לפי "),
    link("TheMarker", URL_ARTICLE),
    t(
      ", הוא אמר שהיקף ההורדות יצר עומס כבד שעלול היה להשבית חלק ממערכות הרשות, ושהצעד שננקט הוא \"שלב ביניים בלבד שנועד למנוע תקלות וקריסת מערכות\". לדבריו, עדיין לא התקבלה החלטה עקרונית לסגור את האפשרות לשימוש רחב יותר במידע: הרשות בוחנת אם נדרש שינוי מדיניות כולל, ואם הדבר מצריך התערבות בחקיקה, ותכריע בשבועות הקרובים.",
    ),
  ],
};

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const write = process.argv.includes("--write");

  // 1. publications list (upsert by url — safe to repeat)
  if (write) {
    const m = await fetch(`${SITE}/api/v1/media-appearances`, { method: "PUT", headers, body: JSON.stringify(MEDIA) });
    console.log("media:", m.status, await m.text());
    if (!m.ok) process.exit(1);
  }

  // 2. the post
  const url = `${SITE}/api/v1/plilist/${SLUG}/edit`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
  const post = (await res.json()) as { content: Node; updatedAt: string };
  const blocks = [...(post.content.content ?? [])];

  if (blocks.some((n) => plain(n).includes("אהרונוביץ"))) {
    console.log("post: paragraph already there; nothing to do.");
    return;
  }
  let anchor = blocks.findIndex((n) => n.type === "paragraph" && plain(n).includes("רן בר-זיק"));
  if (anchor === -1) {
    anchor = blocks.findIndex((n) => n.type === "paragraph" && plain(n).startsWith("הרשות מסרה ל-TheMarker שהיא לא חסמה"));
  }
  if (anchor === -1) throw new Error("anchor paragraph (Bar-Zik / the Authority's response) not found");
  blocks.splice(anchor + 1, 0, PARAGRAPH);
  console.log(`post: inserting after block ${anchor} (${blocks.length} blocks)`);

  if (!write) {
    console.log("dry run — pass --write to save.");
    return;
  }
  const put = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ baseUpdatedAt: post.updatedAt, content: { ...post.content, content: blocks } }),
  });
  console.log("post:", put.status, await put.text());
  if (!put.ok) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
