/**
 * Rotem Sterkman's TheMarker weekend interview (9.10.2026) — the real-estate
 * register, the Tax Authority, the mapi-addresses petition, Tolaat HaMishpat
 * and Better Rail. Adds it to the publications list (upsert by url, safe to
 * repeat), tagged to the real-estate case, which is the interview's headline.
 *
 *   npx tsx scripts/add-weekend-interview.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";

const MEDIA = {
  url: "https://www.themarker.com/weekend/2026-10-09/ty-article-magazine/.highlight/000001a1-16b1-dba5-a5bf-dff1a8590000",
  title: "עו\"ד גיא זומר: \"אנשים חולמים על נכס, וזה גורם להם לרצות לדעת פרטים על השווי שלו\"",
  description:
    "ראיון במוסף סופשבוע של TheMarker (רותם שטרקמן): על פתיחת מאגר עסקאות הנדל\"ן של 30 השנים האחרונות והחסימה של רשות המסים, העתירה נגד המרכז למיפוי ישראל על קובץ הכתובות, תולעת המשפט והתביעות שבאו בעקבותיה, ועל ייצוג מפתחי Better Rail מול רכבת ישראל.",
  type: "article",
  source: "TheMarker — סופשבוע",
  date: "2026-10-09",
  isActive: true,
  caseTag: "real-estate-deals",
};

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const res = await fetch(`${SITE}/api/v1/media-appearances`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(MEDIA),
  });
  console.log("media:", res.status, await res.text());
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
