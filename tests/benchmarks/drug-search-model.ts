/**
 * Ground-truth model for the drug-sentencing search benchmark.
 *
 * Two independent expectations are computed for every scenario:
 *
 *  • IMPL   — what the code in src/app/api/rulings/route.ts is *supposed* to
 *             return given its own documented semantics (drug presence from
 *             meta.drug_types, per-drug grams SUM from meta.drug_totals).
 *             API ≠ IMPL  ⇒  a plumbing bug (truncation, a dropped clause,
 *             pagination, caching…).
 *
 *  • INTENT — what a user asking "cocaine, at least 30 grams" means, computed
 *             from the RAW per-offence rows (sql.פירוט_עבירות_סמים) with drug
 *             aliases merged and units converted to grams ourselves.
 *             IMPL ≠ INTENT ⇒ a semantic/data bug (an alias TAG-IT didn't
 *             merge, a unit it didn't convert, a row it dropped).
 *
 * Keeping them apart is the whole point: it tells us whether a wrong result
 * came from our route or from the upstream aggregation.
 */
import { readFileSync } from "fs";

export const CORPUS_FILE =
  process.env.DRUG_CORPUS_FILE ||
  "C:/Users/zomer/AppData/Local/Temp/claude/C--Users-zomer-CLAUDE-CODE-Z-G/ab4509da-7ec8-46bc-b463-9754f02ec667/scratchpad/drug-corpus.json";

export interface CorpusDoc {
  id: number;
  case_name: string | null;
  date: string | null;
  totals: unknown;
  detail: unknown;
  drug_types: unknown;
  max_grams: unknown;
  per_drug_g: Record<string, unknown> | null;
  defendants?: number | null;
  confessed?: string | null;
}

export function loadCorpus(file = CORPUS_FILE): CorpusDoc[] {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as CorpusDoc[];
  } catch {
    throw new Error(
      `corpus cache missing (${file}).\n` +
        `Run:  npx tsx tests/benchmarks/fetch-drug-corpus.ts`,
    );
  }
}

export const arr = (x: unknown): Record<string, unknown>[] =>
  Array.isArray(x) ? (x.filter((e) => e && typeof e === "object") as Record<string, unknown>[]) : [];
export const strs = (x: unknown): string[] =>
  Array.isArray(x) ? x.map((v) => String(v)) : [];

/* ── canonicalisation (INTENT side) ───────────────────────────────────────
   Alias table for the 10 filterable drugs, derived from the actual corpus
   vocabulary of sql.פירוט_עבירות_סמים[].סוג_הסם. Matching is done on a
   normalised string (spaces/quotes/parentheticals stripped) so new spelling
   variants of the same word still land. */
const DRUG_ALIASES: Record<string, string[]> = {
  קנאביס: [
    "קנאביס", "קנביס", "קנבוס", "קאנביס", "קאנבוס", "קנאבוס", "מריחואנה",
    "מריחוואנה", "גראס", "מרחואנה", "CANNABIS", "MARIJUANA",
    "DELTA9TETRAHYDROCANNABINOL", "THC", "קנבוסרפואי", "קנאביסרפואי",
  ],
  קוקאין: ["קוקאין", "COCAINE", "קראק", "CRACK"],
  חשיש: ["חשיש", "HASHISH", "HASH"],
  MDMA: ["MDMA", "אקסטזי", "ECSTASY", "אמדיאמאיי"],
  הרואין: ["הרואין", "הירואין", "HEROIN"],
  קטמין: ["קטמין", "קטאמין", "KETAMINE", "KETAMIN"],
  LSD: ["LSD", "אלאסדי"],
  מתאמפטמין: [
    "מתאמפטמין", "מתאמפטאמין", "METHAMPHETAMINE", "METH", "קריסטל",
    "מטאמפטמין",
  ],
  בופרנורפין: ["בופרנורפין", "BUPRENORPHINE", "סובוטקס", "SUBUTEX"],
  פסילוצין: ["פסילוצין", "PSILOCIN", "PSILOCYBIN", "פסילוסיבין", "פטריות"],
};

const normDrug = (s: string): string =>
  String(s)
    .replace(/\(.*?\)/g, "")
    .replace(/[\s"'׳״,\-\u05F3\u05F4]/g, "")
    .toUpperCase()
    .trim();

const ALIAS_INDEX = new Map<string, string>();
for (const [canon, list] of Object.entries(DRUG_ALIASES)) {
  for (const a of list) ALIAS_INDEX.set(normDrug(a), canon);
}

/** Canonical drug for a raw name, or null when it isn't one of the 10. */
export function canonDrug(raw: unknown): string | null {
  const n = normDrug(String(raw ?? ""));
  if (!n) return null;
  const exact = ALIAS_INDEX.get(n);
  if (exact) return exact;
  // Compound strings ("קנבוס וחשיש", "MDMA, KETAMINE") — first match wins is
  // wrong, so return null and let the caller count it as ambiguous.
  return null;
}
/**
 * All canonical drugs a raw label MENTIONS — for PRESENCE only.
 *
 * A compound label ("MDMA, KETAMINE") names two drugs but carries a single
 * quantity, so it may widen "which drugs does this case involve" and must
 * never widen a sum. Use `canonDrug` (single, or null) for anything that
 * adds up grams; see `intentGrams`.
 */
export function canonDrugsAll(raw: unknown): string[] {
  const one = canonDrug(raw);
  if (one) return [one];
  const n = normDrug(String(raw ?? ""));
  if (!n) return [];
  const hits = new Set<string>();
  for (const [alias, canon] of ALIAS_INDEX) {
    if (alias.length >= 3 && n.includes(alias)) hits.add(canon);
  }
  return [...hits];
}

/* ── units ── */
const GRAM_UNITS = /^(גרם|גר|גרמים|GRAM|GR|G)$/;
const KG_UNITS = /^(קילוגרם|קג|קייג|קילו|KG|KILOGRAM|KILO)$/;
const MG_UNITS = /^(מיליגרם|מג|MG)$/;
// NOTE: \b is useless on Hebrew (Hebrew letters aren't \w), so the qualifier
// words are stripped unanchored — "גרם נטו" / "קילוגרם נטו" / "גרם לערך" are
// all the same mass unit as far as a quantity filter is concerned.
const normUnit = (s: unknown): string =>
  String(s ?? "")
    .replace(/(נטו|ברוטו|לערך|בקירוב|בערך|משוער)/g, "")
    .replace(/[\s"'׳״.\-]/g, "")
    .toUpperCase()
    .trim();

/** Grams multiplier for a raw unit string, or null when it isn't a mass. */
export function gramFactor(rawUnit: unknown): number | null {
  const u = normUnit(rawUnit);
  if (GRAM_UNITS.test(u)) return 1;
  if (KG_UNITS.test(u)) return 1000;
  if (MG_UNITS.test(u)) return 0.001;
  return null;
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/* ── per-doc aggregates ─────────────────────────────────────────────────── */

/** IMPL: canonical drug → summed grams, straight out of meta.drug_totals. */
export function implGrams(doc: CorpusDoc): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of arr(doc.totals)) {
    const drug = row["סוג_הסם"];
    const total = row["כמות_כוללת"];
    if (typeof drug === "string" && row["יחידה"] === "גרם" && typeof total === "number") {
      m.set(drug, (m.get(drug) ?? 0) + total);
    }
  }
  return m;
}

/**
 * INTENT: canonical drug → summed grams, recomputed from the raw offence rows.
 *
 * A component whose label names more than one drug ("MDMA, KETAMINE") is
 * SKIPPED, not credited to each. It carries one quantity for one seizure the
 * extraction couldn't separate; adding it to both drugs would invent the
 * amount twice over, which is exactly the class of error this benchmark
 * exists to catch. Those components are reported separately by the audit
 * ("כינויים שלא אוחדו"), not silently folded into a total.
 */
export function intentGrams(doc: CorpusDoc): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of arr(doc.detail)) {
    const q = num(e["מספר_כמות"]);
    const f = gramFactor(e["יחידת_מידה"]);
    if (q == null || f == null) continue;
    const d = canonDrug(e["סוג_הסם"]);   // single drug only — never a compound
    if (!d) continue;
    m.set(d, (m.get(d) ?? 0) + q * f);
  }
  return m;
}

/** INTENT: every canonical drug the judgment mentions at all. */
export function intentDrugs(doc: CorpusDoc): Set<string> {
  const s = new Set<string>();
  for (const e of arr(doc.detail)) for (const d of canonDrugsAll(e["סוג_הסם"])) s.add(d);
  return s;
}

/* ── the query model ─────────────────────────────────────────────────────── */

export interface Query {
  drugs?: string[];
  mode?: "or" | "and";
  min?: number;
  max?: number;
  /** extra predicate for scenarios that add a non-drug filter */
  extra?: (d: CorpusDoc) => boolean;
}

const inRange = (v: number | null | undefined, q: Query): boolean => {
  if (v == null) return false;
  if (q.min != null && v < q.min) return false;
  if (q.max != null && v > q.max) return false;
  return true;
};

/** Route-faithful expectation (meta.drug_types + meta.drug_totals). */
export function matchImpl(doc: CorpusDoc, q: Query): boolean {
  if (q.extra && !q.extra(doc)) return false;
  const drugs = q.drugs ?? [];
  const types = new Set(strs(doc.drug_types));
  const hasQty = q.min != null || q.max != null;
  if (drugs.length) {
    const presence =
      q.mode === "and" ? drugs.every((d) => types.has(d)) : drugs.some((d) => types.has(d));
    if (!presence) return false;
  }
  if (!hasQty) return true;
  if (!drugs.length) return inRange(num(doc.max_grams), q); // case-max fallback
  const g = implGrams(doc);
  return q.mode === "and"
    ? drugs.every((d) => inRange(g.get(d), q))
    : drugs.some((d) => inRange(g.get(d), q));
}

/** User-intent expectation (aliases merged + units converted from raw rows). */
export function matchIntent(doc: CorpusDoc, q: Query): boolean {
  if (q.extra && !q.extra(doc)) return false;
  const drugs = q.drugs ?? [];
  // Drug presence: meta.drug_types OR a raw row naming an alias of it.
  const present = new Set([...strs(doc.drug_types), ...intentDrugs(doc)]);
  const hasQty = q.min != null || q.max != null;
  if (drugs.length) {
    const presence =
      q.mode === "and" ? drugs.every((d) => present.has(d)) : drugs.some((d) => present.has(d));
    if (!presence) return false;
  }
  if (!hasQty) return true;
  const g = intentGrams(doc);
  if (!drugs.length) return inRange(Math.max(0, ...g.values()) || null, q);
  return q.mode === "and"
    ? drugs.every((d) => inRange(g.get(d), q))
    : drugs.some((d) => inRange(g.get(d), q));
}

export function countImpl(corpus: CorpusDoc[], q: Query): number {
  return corpus.reduce((n, d) => n + (matchImpl(d, q) ? 1 : 0), 0);
}
export function countIntent(corpus: CorpusDoc[], q: Query): number {
  return corpus.reduce((n, d) => n + (matchIntent(d, q) ? 1 : 0), 0);
}
