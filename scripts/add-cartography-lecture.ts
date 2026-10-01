/**
 * Adds the 24.9.2026 cartography-conference lecture to the publications list,
 * through the write API (needs ZG_API_KEY with media:write, from .env.local).
 * Idempotent: the API upserts by url.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";

const ITEM = {
  url: "https://isrcartogis.wixsite.com/annualconference2026/program",
  title: "כשעורך דין נוגע לכם במפה: הסיכונים, האתגרים והחשיבות של גירוד מידע גאו־מרחבי פתוח",
  description:
    "הרצאה בכנס השנתי של האגודה הישראלית לכרטוגרפיה ולמערכות מידע גאוגרפי, במושב \"מידע פתוח ויישומי GIS\" (יו\"ר: דרור בוגין), מטעם עמותת התמנון ומיזם \"גרסאות לעם\".",
  type: "lecture",
  source: "כנס האגודה הישראלית לכרטוגרפיה ולמערכות מידע גאוגרפי 2026",
  date: "2026-09-24",
  isActive: true,
};

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const res = await fetch(`${SITE}/api/v1/media-appearances`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(ITEM),
  });
  console.log(res.status, await res.text());
  if (!res.ok) process.exit(1);
}

main();
