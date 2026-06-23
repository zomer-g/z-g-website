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
      for (const el of arr) {
        if (!el || typeof el !== "object") continue;
        const rawLaw = String(el["שם_חוק_רשמי"] ?? el["שם_החוק"] ?? "").trim();
        const law = canonLaw(rawLaw);
        const sec = String(el["סעיף_החוק"] ?? "").trim();
        if (!law || !sec || !SECTION_RE.test(sec)) continue;
        if (!byLaw.has(law)) byLaw.set(law, new Set());
        byLaw.get(law)!.add(sec);
      }
    }
    process.stdout.write(`page ${page}: seen ${seen}/${total}\r`);
    page++;
  }

  // Sort sections naturally (numeric prefix, then the rest), laws by frequency.
  const secKey = (s: string) => {
    const m = /^(\d+)/.exec(s);
    return [m ? parseInt(m[1], 10) : 9999, s] as [number, string];
  };
  const map: Record<string, string[]> = {};
  const order = [...byLaw.entries()].sort((a, b) => b[1].size - a[1].size);
  for (const [law, set] of order) {
    map[law] = [...set].sort((a, b) => {
      const ka = secKey(a), kb = secKey(b);
      return ka[0] - kb[0] || ka[1].localeCompare(kb[1], "he");
    });
  }
  writeFileSync("scripts/lawsection-map.json", JSON.stringify(map, null, 1));
  console.log(`\nDONE: ${Object.keys(map).length} laws, scanned ${seen} docs`);
  console.log("top laws:", order.slice(0, 6).map(([l, s]) => `${l}(${s.size})`).join(", "));
}
main();
