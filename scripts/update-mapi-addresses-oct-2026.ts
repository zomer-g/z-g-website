/**
 * Update the mapi-addresses case post with the proceeding's progress up to
 * 1.10.2026: the 3.8 decision (affidavit / documents to the court), the 6.9
 * hearing (material to the judge in a sealed envelope) and the 1.10
 * postponement to 20.12.2026. Uploads the three documents (redacted) into the
 * "court" section and replaces the post's closing "still ongoing" paragraph
 * with a dated section. plilist:edit + cases:write; idempotent.
 *
 *   npx tsx scripts/update-mapi-addresses-oct-2026.ts <dir-with-the-pdfs> [--write]
 */

import { readFileSync } from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const CASE_TAG = "mapi-addresses";
const SLUG = "mapi-address-layer";
const HEADING = "מה קרה מאז";
const doc = (f: string) => `/uploads/${f}`;

const DOCS = [
  {
    file: "api-mapi-30638-decision-2026-08-03.pdf",
    title: "החלטה: המדינה תגבה את טענותיה בתצהיר",
    description:
      "המדינה הגישה עד אז רק תגובה מקדמית, בלי תצהיר. בית המשפט קובע שלשם דיון בטענות ההגנה של המשיבים \"שומה עליהם להציג את המסמכים בפני בית המשפט או למצער להציג פרפרזה שלהם\", ומורה להם להגיש תצהיר.",
    docDate: "3.8.2026",
    sortDate: "2026-08-03T10:00:00.000Z",
    order: 9,
  },
  {
    file: "api-mapi-30638-hearing-2026-09-06.pdf",
    title: "פרוטוקול והחלטה בדיון, 6.9.2026",
    description:
      "החומר לא הובא לדיון, ובית המשפט מורה שיועבר לעיונו במעטפה סגורה בתוך 7 ימים. לאחר העיון תינתן החלטה על המשך התיק.",
    docDate: "6.9.2026",
    sortDate: "2026-09-06T10:00:00.000Z",
    order: 10,
  },
  {
    file: "api-mapi-30638-decision-2026-10-01.pdf",
    title: "החלטה: הדיון נדחה ל-20.12.2026",
    description: "לבקשת המדינה ובהסכמה, הדיון שנקבע ל-4.10.2026 נדחה ל-20.12.2026.",
    docDate: "1.10.2026",
    sortDate: "2026-10-01T10:00:00.000Z",
    order: 11,
  },
];

type Node = { type: string; content?: Node[]; text?: string; marks?: unknown[]; attrs?: Record<string, unknown> };
type Part = string | { text: string; href: string };
const t = (part: Part): Node =>
  typeof part === "string"
    ? { type: "text", text: part }
    : { type: "text", text: part.text, marks: [{ type: "link", attrs: { href: part.href, target: "_blank" } }] };
const p = (...parts: Part[]): Node => ({ type: "paragraph", content: parts.map(t) });
const plain = (n: Node): string => (n.text ?? "") + (n.content ?? []).map(plain).join("");

const SECTION: Node[] = [
  { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: HEADING }] },
  p(
    `באוגוסט `,
    { text: "קבע בית המשפט", href: doc("api-mapi-30638-decision-2026-08-03.pdf") },
    ` שאם המדינה רוצה להתגונן בטענה שהחומר חסוי, היא צריכה להראות אותו: "שומה עליהם להציג את המסמכים בפני בית המשפט או למצער להציג פרפרזה שלהם". עד אז הגישה המדינה רק תגובה מקדמית, בלי תצהיר, ובית המשפט הורה לה לגבות את טענותיה בתצהיר. במקביל, הוגשה בקשה מוסכמת למחוק מהעתירה את הגורם הפרטי שצורף כמשיב, בלי הוצאות.`,
  ),
  p(
    `בדיון ב-6 בספטמבר 2026 התברר שהחומר שבמחלוקת לא הובא לבית המשפט. `,
    { text: "ההחלטה", href: doc("api-mapi-30638-hearing-2026-09-06.pdf") },
    `: "החומר יועבר לעיוני במעטפה סגורה בתוך 7 ימים מהיום. לאחר עיון בחומר תינתן החלטה בדבר המשך התיק". זה בדיוק מה שבית המשפט הציע באפריל, ושהמדינה סירבה לו אז.`,
  ),
  p(
    `הדיון הבא נקבע ל-4 באוקטובר, ולבקשת המדינה `,
    { text: "נדחה", href: doc("api-mapi-30638-decision-2026-10-01.pdf") },
    ` ל-20 בדצמבר 2026. אעדכן כאן, ומסמכי התיק יתווספו למטה ככל שיתקדם.`,
  ),
];

const OLD_CLOSING = "ההליך עדיין מתנהל. אעדכן כאן, ומסמכי התיק יתווספו למטה ככל שיתקדם.";

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: update-mapi-addresses-oct-2026.ts <dir> [--write]");
  const write = process.argv.includes("--write");
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const auth = { Authorization: `Bearer ${key}` };
  const json = { ...auth, "Content-Type": "application/json" };

  const url = `${SITE}/api/v1/plilist/${SLUG}/edit`;
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
  const post = (await res.json()) as { content: Node; updatedAt: string; status: string };
  const blocks = [...(post.content.content ?? [])];
  const already = blocks.some((n) => n.type === "heading" && plain(n) === HEADING);
  const at = blocks.findIndex((n) => n.type === "paragraph" && plain(n).trim() === OLD_CLOSING);
  if (!already && at === -1) throw new Error("closing paragraph not found (was it edited?)");
  if (!already) blocks.splice(at, 1, ...SECTION);
  console.log(`post ${post.status}: ${already ? "section already there" : `replacing block ${at}`}`);

  if (!write) {
    console.log("dry run — pass --write.");
    return;
  }

  for (const d of DOCS) {
    const up = await fetch(`${SITE}/api/v1/uploads/${d.file}`, {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/pdf" },
      body: readFileSync(path.join(dir, d.file)),
    });
    if (!up.ok) throw new Error(`upload ${d.file}: ${up.status} ${await up.text()}`);
    const { file, ...meta } = d;
    const r = await fetch(`${SITE}/api/v1/case-documents`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({
        ...meta,
        caseTag: CASE_TAG,
        category: "court",
        citation: "עת\"מ 30638-12-25",
        authority: "כב' השופטת לימור ביבי",
        fileUrl: doc(file),
        isActive: true,
      }),
    });
    if (!r.ok) throw new Error(`document ${d.file}: ${r.status} ${await r.text()}`);
    console.log("doc:", d.title);
  }

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
