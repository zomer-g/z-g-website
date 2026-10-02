/**
 * Adds the dictionary entry "פועל טכנולוגי" through the write API
 * (PUT /api/v1/milon/<slug>, scope milon:write).
 *
 *   npx tsx scripts/add-milon-poel-technologi.ts
 *
 * Reads ZG_API_KEY from .env.local. ZG_SITE overrides the target site.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const SLUG = "poel-technologi";

const entry = {
  term: "פועל טכנולוגי",
  vocalized: "פּוֹעֵל טֶכְנוֹלוֹגִי",
  partOfSpeech: "צֵרוּף (שֵׁם + תֹּאַר)",
  etymology:
    "צירוף של \"פּוֹעֵל\" (עובד כפיים, מי שמבצע ולא מתכנן) ו\"טֶכְנוֹלוֹגִי\". הצירוף נבנה כניגוד מכוון ל\"איש טכנולוגיה\".",
  inflections:
    "הטיות: נ' פּוֹעֶלֶת טֶכְנוֹלוֹגִית, ר' פּוֹעֲלִים טֶכְנוֹלוֹגִיִּים, ר\"נ פּוֹעֲלוֹת טֶכְנוֹלוֹגִיּוֹת.",
  domains: ["טכנולוגיה", "פוליטיקה וממשל", "סלנג"],
  definitions: [
    {
      label: "",
      text: "עובד באגף מערכות מידע של גוף ציבורי (משרד ממשלתי, רשות או תאגיד סטטוטורי). התפקיד שלו טכנולוגי, אבל הרמה המקצועית שלו מביכה. הוא נמצא בתחתית שרשרת המזון של עולם הטכנולוגיה: מבצע הוראות ומתחזק מערכות מיושנות בלי להבין לעומק מה הוא מפעיל.",
    },
    {
      label: "בהשאלה",
      text: "מי שמשתמש בכלים הטכנולוגיים שבידיו בגוף ציבורי נגד הציבור: חוסם גישה למידע, מקשיח ממשקים וסוגר מאגרים, במקום לשרת את מי שהמערכת נועדה לשרת.",
    },
  ],
  example:
    '"הקוד של הסקרייפר שלי נסגר, בניגוד לרוב הפרויקטים שלי שהקוד להם פתוח, בגלל החשש שלי שזה מנוצל לרעה על ידי פועלים טכנולוגיים בגופים ציבוריים שנחושים לפגוע בציבור בישראל." (ציוץ, 2.10.2026)',
  status: "PUBLISHED",
};

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const res = await fetch(`${SITE}/api/v1/milon/${SLUG}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PUT ${res.status} ${text}`);
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
