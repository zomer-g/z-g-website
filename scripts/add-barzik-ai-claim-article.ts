/**
 * Ran Bar-Zik's TheMarker piece (1.10.2026) testing the Tax Authority's
 * "AI attacks" explanation for locking the real-estate register:
 *   1. adds it to the publications list, tagged to the case;
 *   2. adds a paragraph to the post right after the Authority's response
 *      ("הרשות מסרה ל-TheMarker שהיא לא חסמה..."), which is the claim the
 *      article checks. plilist:edit API; reads the live post and patches it.
 *
 *   npx tsx scripts/add-barzik-ai-claim-article.ts            # dry run
 *   npx tsx scripts/add-barzik-ai-claim-article.ts --write
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "real-estate-deals-open";
const URL_ARTICLE =
  "https://www.themarker.com/captain-internet/2026-10-01/ty-article/.premium/000001a0-f284-dbb2-a9f8-fbcf54340000";

const MEDIA = {
  url: URL_ARTICLE,
  title: "\"מתקפות AI\"? ההסבר של רשות המסים להקשחת הכניסה למאגר הנדל\"ן לא מסתדר עם העובדות",
  description:
    "רן בר-זיק בדק את הקוד ששימש לאיסוף נתוני העסקאות מאתר רשות המסים, ומצא שלטענת הרשות על \"מתקפות AI\" אין בסיס ושהקוד לא יכול לגרום להפרעה באתר. הרשות, מצדה, הוסיפה מכשולים ואימות דו-שלבי לכניסה למאגר.",
  type: "article",
  source: "TheMarker",
  date: "2026-10-01",
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
    t("את ההסבר הזה בדק רן בר-זיק ב-"),
    link("TheMarker", URL_ARTICLE),
    t(
      ". הוא עבר על הקוד ששימש לאיסוף המידע מאתר הרשות, ומצא שלטענה על \"מתקפות AI\" אין בסיס, ושהקוד הזה לא יכול לגרום להפרעה באתר. כלומר, המכשולים והאימות הדו-שלבי שהרשות הציבה בכניסה למאגר נשענים על הסבר שלא עומד בבדיקה.",
    ),
  ],
};

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const write = process.argv.includes("--write");

  if (write) {
    const m = await fetch(`${SITE}/api/v1/media-appearances`, { method: "PUT", headers, body: JSON.stringify(MEDIA) });
    console.log("media:", m.status, await m.text());
    if (!m.ok) process.exit(1);
  }

  const url = `${SITE}/api/v1/plilist/${SLUG}/edit`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
  const post = (await res.json()) as { content: Node; updatedAt: string };
  const blocks = [...(post.content.content ?? [])];

  if (blocks.some((n) => plain(n).includes("רן בר-זיק"))) {
    console.log("post: paragraph already there; nothing to do.");
    return;
  }
  const anchor = blocks.findIndex((n) => n.type === "paragraph" && plain(n).startsWith("הרשות מסרה ל-TheMarker שהיא לא חסמה"));
  if (anchor === -1) throw new Error("anchor paragraph (the Authority's response) not found");
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
