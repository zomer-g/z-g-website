/**
 * TheMarker, 4.10.2026 (Amit Davidov): share of second-hand apartments sold
 * at a real loss, 2022-2026, analysed from the deals register released in
 * גרסאות לעם. Adds it to the publications list, tagged to the deals case.
 * Through the write API (media:write). Idempotent: upsert by url.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";

const ITEM = {
  url: "https://www.themarker.com/realestate/2026-10-04/ty-article/.highlight/000001a0-f7af-de31-a7f0-ffbf67b50000",
  title: "הרבה יותר ישראלים מוכרים בהפסד את הדירה שקנו: המספרים ב–24 ערים נחשפים",
  description:
    "בדיקה של כל מכירות הדירות מיד שנייה מאז 2022, על בסיס מסד הנתונים של רשות המסים ששוחרר לציבור: שיעור הדירות שנמכרו בהפסד ריאלי קפץ כמעט פי ארבעה, מ-2.8% ב-2022 ל-11.1% ב-2026. בבאר שבע כמעט אחת מכל ארבע עסקאות הפסדית.",
  type: "article",
  source: "TheMarker",
  date: "2026-10-04",
  isActive: true,
  caseTag: "real-estate-deals",
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
