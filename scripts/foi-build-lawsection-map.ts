import "dotenv/config";
import { writeFileSync } from "fs";

const BASE = "https://www.z-g.co.il/api/rulings?category=foi-judgments";
const ARR = "sql.טענות_סעיפי_חוק_שנדונו";

// Collapse a law name to a canonical short form: drop the ", התש..-YYYY"
// year-suffix and any trailing comma/space, so "חוק חופש המידע, התשנ\"ח-1998"
// and "חוק חופש המידע" merge into one entry. The canonical form is also a
// substring of the long form, so an upstream `contains` narrows to both.
function canonLaw(name: string): string {
  return name
    .replace(/,?\s*הת[^,]*?-?\s*\d{4}.*$/u, "")
    .replace(/[\s,]+$/u, "")
    .trim();
}

// Keep only well-formed section tokens: a number, optionally followed by a
// Hebrew letter and/or parenthesised parts (9, 9(א), 9(ב)(4), 8(1), 6א, 17(ד)).
// Drops noise like "?(ב)(5)", "ל(א)(4)", "לא צוין...", "2(7), 2(8)", ranges.
const SECTION_RE = /^\d+(\([^)]+\)|[א-ת])*$/u;

async function main() {
  const byLaw = new Map<string, Set<string>>();
  // How many distinct rulings cite each law — drives the dropdown order so the
  // most-common law (חוק חופש המידע) sits at the top, not buried mid-list.
  const lawDocCount = new Map<string, number>();
  let page = 1;
  let total = Infinity;
  let seen = 0;
  while (seen < total && page <= 60) {
    const res = await fetch(`${BASE}&page=${page}`);
    const j: any = await res.json();
    total = j.total ?? 0;
    const rulings: any[] = j.rulings ?? [];
    if (rulings.length === 0) break;
    for (const r of rulings) {
      seen++;
      const arr = (r.fields ?? {})[ARR];
      if (!Array.isArray(arr)) continue;
      const lawsInDoc = new Set<string>();
      for (const el of arr) {
        if (!el || typeof el !== "object") continue;
        const rawLaw = String(el["שם_חוק_רשמי"] ?? el["שם_החוק"] ?? "").trim();
        const law = canonLaw(rawLaw);
        const sec = String(el["סעיף_החוק"] ?? "").trim();
        if (!law || !sec || !SECTION_RE.test(sec)) continue;
        if (!byLaw.has(law)) byLaw.set(law, new Set());
        byLaw.get(law)!.add(sec);
        lawsInDoc.add(law);
      }
      for (const law of lawsInDoc) {
        lawDocCount.set(law, (lawDocCount.get(law) ?? 0) + 1);
      }
    }
    process.stdout.write(`page ${page}: seen ${seen}/${total}\r`);
    page++;
  }

  // Sort sections naturally (numeric prefix, then the rest).
  const secKey = (s: string) => {
    const m = /^(\d+)/.exec(s);
    return [m ? parseInt(m[1], 10) : 9999, s] as [number, string];
  };
  // Laws ordered by document frequency desc (tiebreak: more sections, then name).
  // Stored as an explicit array because Postgres jsonb does NOT preserve object
  // key order — the frontend must read `lawOrder`, not Object.keys(map).
  const lawOrder = [...byLaw.keys()].sort((a, b) => {
    const ca = lawDocCount.get(a) ?? 0, cb = lawDocCount.get(b) ?? 0;
    if (cb !== ca) return cb - ca;
    const sa = byLaw.get(a)!.size, sb = byLaw.get(b)!.size;
    return sb - sa || a.localeCompare(b, "he");
  });
  const map: Record<string, string[]> = {};
  for (const law of lawOrder) {
    map[law] = [...byLaw.get(law)!].sort((a, b) => {
      const ka = secKey(a), kb = secKey(b);
      return ka[0] - kb[0] || ka[1].localeCompare(kb[1], "he");
    });
  }
  writeFileSync(
    "scripts/lawsection-map.json",
    JSON.stringify({ map, lawOrder }, null, 1),
  );
  console.log(`\nDONE: ${lawOrder.length} laws, scanned ${seen} docs`);
  console.log(
    "top laws:",
    lawOrder.slice(0, 6).map((l) => `${l}(${lawDocCount.get(l)} docs)`).join(", "),
  );
}
main();
