/**
 * The 30.9.2026 "האינטרסנטים" (TheMarker) episode on the blocking of the
 * real-estate deals register:
 *   1. adds it to the publications list as a podcast, tagged to the case;
 *   2. adds a paragraph with the TheMarker / Spotify / Apple links to the post,
 *      just before its closing "אעדכן כאן מה הלאה." line (plilist:edit API —
 *      reads the live post and patches it; refuses if already there).
 *
 *   npx tsx scripts/add-interesantim-podcast.ts            # dry run for the post
 *   npx tsx scripts/add-interesantim-podcast.ts --write
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "real-estate-deals-open";

const EPISODE = {
  themarker:
    "https://www.themarker.com/podcasts/2026-09-30/ty-article-podcast/000001a0-f220-de31-a7f0-fabffcb90000",
  spotify: "https://open.spotify.com/episode/6Ph6NOxbiQrQLWLIrS3Pg2",
  apple:
    "https://podcasts.apple.com/us/podcast/%D7%97%D7%A1%D7%99%D7%9E%D7%AA-%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%A1%D7%A7%D7%90%D7%95%D7%AA-%D7%94%D7%A0%D7%93%D7%9C-%D7%9F-%D7%9B%D7%9A-%D7%A0%D7%A8%D7%90%D7%99%D7%AA-%D7%94%D7%A8%D7%A9%D7%9C%D7%A0%D7%95%D7%AA-%D7%A9%D7%9C-%D7%A8%D7%A9%D7%95%D7%AA-%D7%94%D7%9E%D7%A1%D7%99%D7%9D/id1441247448?i=1000792383615",
};

const TITLE = "חסימת מאגר עסקאות הנדל\"ן: כך נראית הרשלנות של רשות המסים";

const MEDIA = {
  url: EPISODE.themarker,
  title: TITLE,
  description:
    "פרק של \"האינטרסנטים\", הפודקאסט של TheMarker עם איתן אבריאל וסמי פרץ, על חסימת הגישה למאגר עסקאות הנדל\"ן של רשות המסים, ימים אחרי שפורסם בגרסאות לעם. האזנה גם בספוטיפיי ובאפל פודקאסטים.",
  type: "podcast",
  source: "TheMarker — האינטרסנטים",
  date: "2026-09-30",
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
    t("על החסימה דיברתי גם ב"),
    link("\"האינטרסנטים\"", EPISODE.themarker),
    t(`, הפודקאסט של TheMarker עם איתן אבריאל וסמי פרץ, בפרק "${TITLE}". אפשר להאזין גם ב`),
    link("ספוטיפיי", EPISODE.spotify),
    t(" וב"),
    link("אפל פודקאסטים", EPISODE.apple),
    t("."),
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

  if (blocks.some((n) => plain(n).includes("האינטרסנטים"))) {
    console.log("post: podcast paragraph already there; nothing to do.");
    return;
  }
  const anchor = blocks.findIndex((n) => n.type === "paragraph" && plain(n).trim() === "אעדכן כאן מה הלאה.");
  if (anchor === -1) throw new Error('anchor "אעדכן כאן מה הלאה." not found');
  blocks.splice(anchor, 0, PARAGRAPH);
  console.log(`post: inserting before block ${anchor} (${blocks.length} blocks)`);

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
