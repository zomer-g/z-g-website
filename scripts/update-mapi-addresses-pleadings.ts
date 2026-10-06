/**
 * mapi-addresses case: the pleadings from the further-particulars round
 * (May–August 2026) and the 23.9.2026 decision ("on its face part of it can
 * be disclosed"). Uploads 5 redacted PDFs, renumbers every court document in
 * date order, and patches the post. plilist:edit + cases:write; idempotent.
 *
 *   npx tsx scripts/update-mapi-addresses-pleadings.ts <dir> [--write]
 */

import { readFileSync } from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const CASE_TAG = "mapi-addresses";
const SLUG = "mapi-address-layer";
const u = (f: string) => `/uploads/${f}`;
const CITE = "עת\"מ 30638-12-25";

const NEW_DOCS = [
  {
    file: "api-mapi-30638-petitioner-particulars-request-2026-05-31.pdf",
    title: "בקשה לצוות על מתן פרטים נוספים",
    description:
      "המדינה הודיעה בדיון שתגובתה המקדמית תשמש ככתב תשובה ולא הגישה תצהיר. הבקשה: לחייב אותה למסור פרטים נוספים על המידע המבוקש, או לאפשר לבית המשפט לעיין בו במעמד צד אחד.",
    docDate: "31.5.2026",
    sortDate: "2026-05-31T10:00:00.000Z",
    authority: "העותר",
  },
  {
    file: "api-mapi-30638-petitioner-reply-particulars-2026-06.pdf",
    title: "תגובת העותר לתגובת המדינה",
    description:
      "פירוט ההחמצות של המדינה לאורך ההליך: מועדים שלא נשמרו, החלטות שלא קוימו ותגובות שלא הוגשו, ובקשה לחייב את המדינה בהוצאות.",
    docDate: "יוני 2026",
    sortDate: "2026-06-28T10:00:00.000Z",
    authority: "העותר",
  },
  {
    file: "api-mapi-30638-state-reply-2026-08.pdf",
    title: "תשובת המדינה לתגובת העותר",
    description: "המדינה מבקשת לדחות את הבקשה לפרטים נוספים ולחייב את העותר בהוצאות.",
    docDate: "יולי 2026",
    sortDate: "2026-07-15T10:00:00.000Z",
    authority: "פרקליטות מחוז תל אביב (אזרחי)",
  },
  {
    file: "api-mapi-30638-petitioner-second-reply-2026-08.pdf",
    title: "תגובת העותר השנייה",
    description:
      "תגובה קצרה לתשובת המדינה. בכותרת: המשיב הפרטי נמחק מהעתירה בהסכמה, לאחר שהצהיר כי אין לו התנגדות למסירת המידע.",
    docDate: "אוגוסט 2026",
    sortDate: "2026-08-02T10:00:00.000Z",
    authority: "העותר",
  },
  {
    file: "api-mapi-30638-decision-2026-09-23.pdf",
    title: "החלטה: על פניו, חלק מהחומר ניתן לגילוי",
    description:
      "\"לאחר שעיינתי בחומר, מצאתי כי על פניו חלקו ניתן לגילוי בהתאם לדין\". כדי לאפשר למדינה להביע עמדה נקבע דיון, שבמסגרתו יוצגו לה במידת הצורך, במעמד צד אחד, החומרים שבית המשפט סבור שניתן לגלותם.",
    docDate: "23.9.2026",
    sortDate: "2026-09-23T10:00:00.000Z",
    authority: "כב' השופטת לימור ביבי",
  },
];

// Every court document, in the order it happened.
const ORDER = [
  "api-mapi-30638-petition-2025-12-10.pdf",
  "api-mapi-30638-state-response-2026-04-13.pdf",
  "api-mapi-30638-transcript-2026-04-20.pdf",
  "api-mapi-30638-decision-2026-04-20.pdf",
  "api-mapi-30638-petitioner-particulars-request-2026-05-31.pdf",
  "api-mapi-30638-state-particulars-2026-06-10.pdf",
  "api-mapi-30638-petitioner-reply-particulars-2026-06.pdf",
  "api-mapi-30638-state-reply-2026-08.pdf",
  "api-mapi-30638-petitioner-second-reply-2026-08.pdf",
  "api-mapi-30638-decision-2026-08-03.pdf",
  "api-mapi-30638-hearing-2026-09-06.pdf",
  "api-mapi-30638-sealed-filing-2026-09.pdf",
  "api-mapi-30638-decision-2026-09-23.pdf",
  "api-mapi-30638-decision-2026-10-01.pdf",
];

/* ─────────────────────────────── Post patch ─────────────────────────────── */

type Node = { type: string; content?: Node[]; text?: string; marks?: unknown[]; attrs?: Record<string, unknown> };
type Part = string | { text: string; href: string } | { text: string; bold: true };
const t = (x: Part): Node =>
  typeof x === "string"
    ? { type: "text", text: x }
    : "href" in x
      ? { type: "text", text: x.text, marks: [{ type: "link", attrs: { href: x.href, target: "_blank" } }] }
      : { type: "text", text: x.text, marks: [{ type: "bold" }] };
const p = (...parts: Part[]): Node => ({ type: "paragraph", content: parts.map(t) });
const plain = (n: Node): string => (n.text ?? "") + (n.content ?? []).map(plain).join("");

const UPDATE_LINE = p(
  { text: "עדכון, 6.10.2026: ", bold: true },
  "בית המשפט עיין בחומר שהמדינה סירבה לחשוף, וקבע שעל פניו חלקו ניתן לגילוי. הפרטים בפרק ",
  { text: "מה קרה מאז", bold: true },
  ".",
);

const PLEADINGS = p(
  `אחרי הדיון באפריל המדינה הודיעה שתגובתה המקדמית תשמש ככתב תשובה, ולא הגישה תצהיר. `,
  { text: "ביקשתי", href: u("api-mapi-30638-petitioner-particulars-request-2026-05-31.pdf") },
  ` שבית המשפט יורה לה למסור פרטים נוספים על החומר, או שיעיין בו בעצמו. המדינה `,
  { text: "התנגדה", href: u("api-mapi-30638-state-particulars-2026-06-10.pdf") },
  `, `,
  { text: "השבתי", href: u("api-mapi-30638-petitioner-reply-particulars-2026-06.pdf") },
  `, המדינה `,
  { text: "השיבה", href: u("api-mapi-30638-state-reply-2026-08.pdf") },
  ` ו`,
  { text: "השבתי שוב", href: u("api-mapi-30638-petitioner-second-reply-2026-08.pdf") },
  `.`,
);

const DECISION_0923 = p(
  `ב-23 בספטמבר, אחרי שעיינה בחומר, `,
  { text: "קבעה השופטת", href: u("api-mapi-30638-decision-2026-09-23.pdf") },
  `: "לאחר שעיינתי בחומר, מצאתי כי על פניו חלקו ניתן לגילוי בהתאם לדין". כדי לאפשר למדינה להביע עמדה נקבע דיון, שבו יוצגו לה, במידת הצורך, החומרים שבית המשפט סבור שניתן לגלותם.`,
);

const OLD_R4 = "במקביל, הוגשה בקשה מוסכמת למחוק מהעתירה את הגורם הפרטי שצורף כמשיב, בלי הוצאות.";
const NEW_R4 =
  "במקביל, הגורם הפרטי שצורף כמשיב נמחק מהעתירה בהסכמה, אחרי שהצהיר כי אין לו התנגדות למסירת המידע.";

function patch(blocks: Node[]): Node[] {
  const out = [...blocks];
  if (out.some((n) => plain(n).startsWith("עדכון, 6.10.2026"))) throw new Error("already updated");

  // the respondent-4 sentence, inside the 3.8 paragraph
  let fixed = 0;
  const walk = (n: Node) => {
    if (typeof n.text === "string" && n.text.includes(OLD_R4)) {
      n.text = n.text.replace(OLD_R4, NEW_R4);
      fixed++;
    }
    n.content?.forEach(walk);
  };
  out.forEach(walk);
  if (fixed !== 1) throw new Error(`respondent-4 sentence found ${fixed} times`);

  const heading = out.findIndex((n) => n.type === "heading" && plain(n) === "מה קרה מאז");
  if (heading === -1) throw new Error("'מה קרה מאז' heading not found");
  out.splice(heading + 1, 0, PLEADINGS);

  const sealed = out.findIndex((n) => plain(n).startsWith("הפעם המדינה הגישה את המסמכים"));
  if (sealed === -1) throw new Error("sealed-filing paragraph not found");
  out.splice(sealed + 1, 0, DECISION_0923);

  out.unshift(UPDATE_LINE);
  return out;
}

/* ─────────────────────────────── Runner ─────────────────────────────── */

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: update-mapi-addresses-pleadings.ts <dir> [--write]");
  const write = process.argv.includes("--write");
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set.");
  const auth = { Authorization: `Bearer ${key}` };
  const json = { ...auth, "Content-Type": "application/json" };

  const url = `${SITE}/api/v1/plilist/${SLUG}/edit`;
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`GET ${res.status} ${await res.text()}`);
  const post = (await res.json()) as { content: Node; updatedAt: string };
  const blocks = patch(post.content.content ?? []);
  console.log(`post: ${post.content.content?.length} → ${blocks.length} blocks`);
  if (!write) return console.log("dry run — pass --write.");

  for (const d of NEW_DOCS) {
    const up = await fetch(`${SITE}/api/v1/uploads/${d.file}`, {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/pdf" },
      body: readFileSync(path.join(dir, d.file)),
    });
    if (!up.ok) throw new Error(`upload ${d.file}: ${up.status} ${await up.text()}`);
  }

  // Renumber: existing documents are re-sent with their own fields + new order.
  const existing = (await (await fetch(`${SITE}/api/case-documents?caseTag=${CASE_TAG}`)).json()) as Record<string, unknown>[];
  const byUrl = new Map(existing.map((e) => [e.fileUrl as string, e]));
  for (const [i, file] of ORDER.entries()) {
    const fresh = NEW_DOCS.find((d) => d.file === file);
    const old = byUrl.get(u(file));
    const body = fresh
      ? { title: fresh.title, description: fresh.description, docDate: fresh.docDate, sortDate: fresh.sortDate, authority: fresh.authority }
      : {
          title: old?.title,
          description: old?.description ?? null,
          docDate: old?.docDate ?? null,
          sortDate: old?.sortDate ?? null,
          authority: old?.authority ?? null,
        };
    if (!fresh && !old) throw new Error(`missing document ${file}`);
    const r = await fetch(`${SITE}/api/v1/case-documents`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({
        ...body,
        caseTag: CASE_TAG,
        category: "court",
        citation: (old?.citation as string) ?? CITE,
        fileUrl: u(file),
        order: 4 + i,
        isActive: true,
      }),
    });
    if (!r.ok) throw new Error(`document ${file}: ${r.status} ${await r.text()}`);
  }
  console.log(`documents: ${ORDER.length} court documents in order`);

  const put = await fetch(url, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ baseUpdatedAt: post.updatedAt, content: { ...post.content, content: blocks } }),
  });
  console.log("post:", put.status, await put.text());
  if (!put.ok) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
