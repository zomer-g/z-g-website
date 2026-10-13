/**
 * Hila Tzion's ynet piece (12.10.2026) on JLL's 2026 global real-estate
 * transparency index — Israel stays 39th of 88 while the Gulf markets pass it,
 * set against the opening of the register and the Tax Authority's limits:
 *   1. adds it to the publications list, tagged to the case;
 *   2. adds a paragraph to the post right after the Tax Authority director's
 *      paragraph ("...אהרונוביץ'..."). plilist:edit API; reads the live post
 *      and patches it; refuses if already there.
 *
 *   npx tsx scripts/add-ynet-transparency-index-article.ts            # dry run
 *   npx tsx scripts/add-ynet-transparency-index-article.ts --write
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "real-estate-deals-open";
const URL_ARTICLE = "https://www.ynet.co.il/economy/article/yokra14923141";

const MEDIA = {
  url: URL_ARTICLE,
  title: "השקיפות בשוק הנדל\"ן הישראלי משתפרת - אבל סעודיה ואבו-דאבי עקפו אותנו",
  description:
    "מדד השקיפות העולמי בנדל\"ן של JLL לשנת 2026 מציב את ישראל במקום ה-39 מתוך 88 מדינות, בעוד מדינות המפרץ עוקפות אותה בזכות הנגשת מידע ודיגיטציה. הכתבה מציבה את הממצאים על רקע פתיחת מאגר עסקאות הנדל\"ן בגרסאות לעם וההגבלות שהטילה רשות המסים על הגישה אליו.",
  type: "article",
  source: "ynet",
  date: "2026-10-12",
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
    t("וההקשר הרחב: "),
    link("ynet", URL_ARTICLE),
    t(
      " דיווח ב-12.10.2026 על מדד השקיפות העולמי בנדל\"ן של JLL לשנת 2026. ישראל נשארה במקום ה-39 מתוך 88 מדינות, עדיין בקבוצת השקיפות הבינונית, בזמן שסעודיה, אבו דאבי ודובאי עקפו אותה, בין היתר בזכות הרחבת מאגרי מידע ודיגיטציה של שירותי הממשלה. לפי JLL, 98.5% מההשקעות הישירות בנדל\"ן בעולם מתרכזות בשווקים בעלי שקיפות גבוהה או גבוהה מאוד, ורק 1.3% בקבוצה שבה נמצאת ישראל. הכתבה מציבה את הממצאים על רקע פתיחת המאגר בגרסאות לעם וההגבלות שהטילה עליו רשות המסים.",
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

  if (blocks.some((n) => plain(n).includes("JLL"))) {
    console.log("post: paragraph already there; nothing to do.");
    return;
  }
  const anchor = blocks.findIndex((n) => n.type === "paragraph" && plain(n).includes("אהרונוביץ"));
  if (anchor === -1) throw new Error("anchor paragraph (the Tax Authority director) not found");
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
