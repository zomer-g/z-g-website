/**
 * mapi-addresses case: the State filed the disputed material for the judge's
 * review in a sealed envelope (after a two-day extension, 14.9 → 16.9.2026).
 * Adds the filing notice to the court section and one sentence to the post's
 * "מה קרה מאז" section, after the 6.9 paragraph. plilist:edit + cases:write.
 *
 *   npx tsx scripts/update-mapi-addresses-sealed.ts <dir-with-the-pdf> [--write]
 */

import { readFileSync } from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "mapi-address-layer";
const FILE = "api-mapi-30638-sealed-filing-2026-09.pdf";
const MARK = "המדינה הגישה את המסמכים";

type Node = { type: string; content?: Node[]; text?: string; marks?: unknown[] };
const plain = (n: Node): string => (n.text ?? "") + (n.content ?? []).map(plain).join("");

const PARAGRAPH: Node = {
  type: "paragraph",
  content: [
    { type: "text", text: "הפעם " },
    {
      type: "text",
      text: "המדינה הגישה את המסמכים",
      marks: [{ type: "link", attrs: { href: `/uploads/${FILE}`, target: "_blank" } }],
    },
    {
      type: "text",
      text: ", אחרי ארכה קצרה, במעטפה סגורה לעיון השופטת, כך שהיא תוכל לבדוק בעצמה אם הוא באמת חסוי.",
    },
  ],
};

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: update-mapi-addresses-sealed.ts <dir> [--write]");
  const write = process.argv.includes("--write");
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set.");
  const auth = { Authorization: `Bearer ${key}` };
  const json = { ...auth, "Content-Type": "application/json" };

  const url = `${SITE}/api/v1/plilist/${SLUG}/edit`;
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
  const post = (await res.json()) as { content: Node; updatedAt: string };
  const blocks = [...(post.content.content ?? [])];
  const already = blocks.some((n) => plain(n).includes(MARK));
  const at = blocks.findIndex((n) => n.type === "paragraph" && plain(n).startsWith("בדיון ב-6 בספטמבר 2026"));
  if (!already && at === -1) throw new Error("6.9 paragraph not found");
  if (!already) blocks.splice(at + 1, 0, PARAGRAPH);
  console.log(already ? "post: already there" : `post: inserting after block ${at}`);
  if (!write) return console.log("dry run — pass --write.");

  const up = await fetch(`${SITE}/api/v1/uploads/${FILE}`, {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/pdf" },
    body: readFileSync(path.join(dir, FILE)),
  });
  if (!up.ok) throw new Error(`upload: ${up.status} ${await up.text()}`);
  const d = await fetch(`${SITE}/api/v1/case-documents`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({
      caseTag: "mapi-addresses",
      category: "court",
      title: "המדינה מגישה את המסמכים החסויים לעיון בית המשפט",
      description:
        "בהתאם להחלטה מ-6.9, ואחרי ארכה של יומיים, המדינה מגישה את המסמכים שבמחלוקת לעיון השופטת, מודפסים ובמעטפה סגורה.",
      docDate: "ספטמבר 2026",
      sortDate: "2026-09-16T10:00:00.000Z",
      citation: "עת\"מ 30638-12-25",
      authority: "פרקליטות מחוז תל אביב (אזרחי), בשם המשיבים",
      fileUrl: `/uploads/${FILE}`,
      order: 10,
      isActive: true,
    }),
  });
  if (!d.ok) throw new Error(`document: ${d.status} ${await d.text()}`);
  console.log("doc: added");

  if (!already) {
    const put = await fetch(url, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ baseUpdatedAt: post.updatedAt, content: { ...post.content, content: blocks } }),
    });
    console.log("post:", put.status, await put.text());
    if (!put.ok) process.exit(1);
  }
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
