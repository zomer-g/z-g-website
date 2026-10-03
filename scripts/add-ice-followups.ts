/**
 * Two more ice pieces by Itzik Yitzhaki on the real-estate deals register:
 *   - 1.10.2026: six years of apartment prices, from גרסאות לעם's data;
 *   - 2.10.2026: party platforms and housing, criticising the Tax Authority's
 *     blocking of the register.
 * Adds both to the publications list (tagged to the case) and a paragraph to
 * the post right after the "journalists are already using it" paragraph.
 * plilist:edit API; reads the live post and patches it.
 *
 *   npx tsx scripts/add-ice-followups.ts            # dry run
 *   npx tsx scripts/add-ice-followups.ts --write
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "real-estate-deals-open";

const PRICES = "https://www.ice.co.il/realestate/news/article/1131680";
const PLATFORMS = "https://www.ice.co.il/realestate/news/article/1131966";

const MEDIA = [
  {
    url: PRICES,
    title: "הנתון שחושף: מה באמת קרה למחירי הדירות ב-6 השנים האחרונות",
    description:
      "ניתוח מחירי הדירות לפי נתוני גרסאות לעם: המחיר החציוני עלה מ-1.295 מיליון שקל ב-2020 ל-1.77 מיליון ב-2026, עלייה של 36.7%, בזמן שמספר העסקאות צונח. האתר פתוח לשימוש חופשי, ואילו ברשות המסים דורשים עכשיו הזדהות כדי להיכנס למאגר.",
    date: "2026-10-01",
  },
  {
    url: PLATFORMS,
    title: "\"רוכשי הדירות ממתינים לממשלה הבאה\": מה יקרה לשוק הנדל\"ן ביום שאחרי?",
    description:
      "עיון במצעי המפלגות הגדולות בנושא הדיור, וביקורת על רשות המסים שחוסמת את הגישה לנתוני העסקאות שגיא זומר מנגיש לציבור, בטענה שכלי AI מפריעים לאתר.",
    date: "2026-10-02",
  },
];

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
    t("ב-ice המשיכו: "),
    link("ניתוח של מחירי הדירות בשש השנים האחרונות", PRICES),
    t(
      " לפי נתוני המאגר מצא שהמחיר החציוני עלה מ-1.295 מיליון שקל ב-2020 ל-1.77 מיליון ב-2026, בזמן שמספר העסקאות צונח. ו",
    ),
    link("טור על מצעי המפלגות בנושא הדיור", PLATFORMS),
    t(" מתח ביקורת על רשות המסים, שחוסמת את הגישה לנתונים האלה בטענה שכלי AI מפריעים לאתר."),
  ],
};

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const write = process.argv.includes("--write");

  if (write) {
    for (const m of MEDIA) {
      const res = await fetch(`${SITE}/api/v1/media-appearances`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...m, type: "article", source: "ice", isActive: true, caseTag: "real-estate-deals" }),
      });
      console.log("media:", res.status, m.date, await res.text());
      if (!res.ok) process.exit(1);
    }
  }

  const url = `${SITE}/api/v1/plilist/${SLUG}/edit`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
  const post = (await res.json()) as { content: Node; updatedAt: string };
  const blocks = [...(post.content.content ?? [])];

  if (blocks.some((n) => plain(n).startsWith("ב-ice המשיכו"))) {
    console.log("post: paragraph already there; nothing to do.");
    return;
  }
  const anchor = blocks.findIndex((n) => n.type === "paragraph" && plain(n).startsWith("ובינתיים, המאגר כבר עושה"));
  if (anchor === -1) throw new Error('anchor paragraph "ובינתיים, המאגר כבר עושה..." not found');
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
