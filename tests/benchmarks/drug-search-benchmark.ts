/* eslint-disable @typescript-eslint/no-explicit-any -- benchmark reads untyped JSON from the API and Render */
/**
 * Drug-sentencing search benchmark — combinations of DRUG TYPE × QUANTITY.
 *
 * Answers three questions the /drug-sentencing page keeps raising:
 *   1. Does a "drug + quantity" search return the right judgments?
 *   2. Do the search results obey basic set logic (monotonicity, OR/AND,
 *      pagination, interaction with the other filters)?
 *   3. Does the per-drug TOTALS table on a card agree with the per-offence
 *      DETAIL table below it — and when it doesn't, which side is wrong?
 *
 * Every scenario is scored against TWO expectations (see drug-search-model.ts):
 *   IMPL   = the route's own documented semantics → gap means a plumbing bug.
 *   INTENT = what the user asked for, recomputed from raw rows → gap means a
 *            data/aggregation bug (unmerged alias, unconverted unit, …).
 *
 * Usage:
 *   npx tsx tests/benchmarks/fetch-drug-corpus.ts        # once, refreshes cache
 *   npx tsx tests/benchmarks/drug-search-benchmark.ts
 *   BENCH_BASE_URL=http://localhost:3000 npx tsx tests/benchmarks/drug-search-benchmark.ts
 *   BENCH_PHASE=audit  npx tsx …        # offline only (no API calls)
 *
 * The live API is rate-limited to 30 req/min per IP, so calls are paced.
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import {
  loadCorpus, countImpl, countIntent, matchImpl, implGrams,
  intentGrams, canonDrugsAll, gramFactor, num, arr, strs,
  type CorpusDoc, type Query,
} from "./drug-search-model";

const BASE = (process.env.BENCH_BASE_URL || "https://www.z-g.co.il").replace(/\/$/, "");
const PHASE = process.env.BENCH_PHASE || "all"; // all | api | audit
const MIN_INTERVAL_MS = Number(process.env.BENCH_INTERVAL_MS || 2600); // ≈23 req/min
const REQ_TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS || 120_000);
const REPORT = process.env.BENCH_REPORT || "tests/benchmarks/DRUG-SEARCH-REPORT.md";

const out: string[] = [];
const say = (s = "") => {
  console.log(s);
  out.push(s);
};
const pct = (a: number, b: number) => (b === 0 ? "—" : `${((a / b) * 100).toFixed(1)}%`);

/* ═══════════════ API client (paced) ═══════════════ */

let lastCall = 0;
/** Server-side failures seen during the run (5xx / network), for the summary. */
const failures: { params: Record<string, string>; status: number; retried: boolean }[] = [];

async function once(params: Record<string, string>) {
  const wait = Math.max(0, lastCall + MIN_INTERVAL_MS - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const u = new URL(`${BASE}/api/rulings`);
  u.searchParams.set("category", "drug-sentencing");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await fetch(u.toString(), { signal: ctl.signal, headers: { Accept: "application/json" } });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ms: Date.now() - t0, cache: res.headers.get("x-cache") || "-", json };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, cache: "-", json: { error: String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One paced request, with a single patient retry on a server-side failure.
 * A 502/504/network error here usually means the web instance just died
 * (the bulk snapshot path is heavy) and is restarting — the retry both keeps
 * the benchmark useful and measures how long the outage lasted.
 */
async function api(params: Record<string, string>): Promise<{
  status: number; ms: number; cache: string; json: any;
}> {
  const first = await once(params);
  if (first.status === 200) return first;
  failures.push({ params, status: first.status, retried: true });
  await new Promise((r) => setTimeout(r, Number(process.env.BENCH_RETRY_DELAY_MS || 20_000)));
  const second = await once(params);
  return { ...second, ms: first.ms + second.ms };
}

/** Did the production instance restart while we were hammering it? */
async function renderCrashes(sinceIso: string): Promise<string[]> {
  const key = process.env.RENDER_API_KEY;
  if (!key) return [];
  try {
    const H = { Authorization: `Bearer ${key}` };
    const svcs = (await (await fetch("https://api.render.com/v1/services?limit=50", { headers: H })).json()) as any[];
    const svc = svcs.find((s: any) => s.service?.name === "z-g-website")?.service;
    if (!svc) return [];
    const ev = (await (await fetch(`https://api.render.com/v1/services/${svc.id}/events?limit=20`, { headers: H })).json()) as any[];
    return ev
      .map((e: any) => e.event)
      .filter((e: any) => e.type === "server_failed" && e.timestamp >= sinceIso)
      .map((e: any) => `${e.timestamp} — ${JSON.stringify(e.details?.reason ?? {})}`);
  } catch {
    return [];
  }
}

/** Build the userFilters JSON the client sends for a drug/qty query. */
function userFilters(q: Query & { text?: string; raw?: Record<string, unknown> }): string {
  const uf: Record<string, unknown> = { ...(q.raw ?? {}) };
  if (q.drugs?.length) {
    uf["meta.drug_types"] = q.drugs;
    if (q.mode === "and") uf["meta.drug_types::mode"] = "and";
  }
  if (q.min != null || q.max != null) {
    const r: Record<string, number> = {};
    if (q.min != null) r.min = q.min;
    if (q.max != null) r.max = q.max;
    uf["meta.drug_max_grams"] = r;
    if (q.unit === "n") uf["meta.drug_max_grams::unit"] = "n";
  }
  return JSON.stringify(uf);
}

/* ═══════════════ scenarios ═══════════════ */

const DRUGS = ["קנאביס", "קוקאין", "חשיש", "MDMA", "הרואין", "קטמין", "LSD", "מתאמפטמין", "בופרנורפין", "פסילוצין"];

interface Scenario {
  name: string;
  q: Query;
  /** extra query params (text search, year range, …) */
  params?: Record<string, string>;
  /** raw extra userFilters entries merged into the JSON */
  raw?: Record<string, unknown>;
  /** offline equivalent of `raw`, so the expectation stays comparable */
  extra?: (d: CorpusDoc) => boolean;
  /** false when no offline ground truth exists (e.g. full-text search) */
  groundTruth?: boolean;
  note?: string;
}

const SCENARIOS: Scenario[] = [
  { name: "בסיס — ללא סינון", q: {} },
  // ── drug only ──
  ...["קנאביס", "קוקאין", "חשיש", "MDMA", "LSD"].map((d) => ({ name: `סם בלבד: ${d}`, q: { drugs: [d] } })),
  // ── drug × quantity ──
  { name: "קוקאין ≥ 30 גרם", q: { drugs: ["קוקאין"], min: 30 } },
  { name: "קוקאין ≥ 1000 גרם", q: { drugs: ["קוקאין"], min: 1000 } },
  { name: "קוקאין 30–100 גרם", q: { drugs: ["קוקאין"], min: 30, max: 100 } },
  { name: "קוקאין ≤ 30 גרם", q: { drugs: ["קוקאין"], max: 30 } },
  { name: "קנאביס ≥ 1 גרם", q: { drugs: ["קנאביס"], min: 1 } },
  { name: "קנאביס ≥ 1000 גרם", q: { drugs: ["קנאביס"], min: 1000 } },
  { name: "חשיש ≥ 100 גרם", q: { drugs: ["חשיש"], min: 100 } },
  { name: "MDMA ≥ 1 גרם (נמדד לרוב בכדורים)", q: { drugs: ["MDMA"], min: 1 } },
  { name: "LSD ≥ 1 גרם (נמדד לרוב בבולים)", q: { drugs: ["LSD"], min: 1 } },
  { name: "קוקאין ≥ 0 גרם (בדיקת כיסוי)", q: { drugs: ["קוקאין"], min: 0 } },
  // ── multi-drug ──
  { name: "קוקאין או חשיש (OR)", q: { drugs: ["קוקאין", "חשיש"], mode: "or" } },
  { name: "קוקאין וגם חשיש (AND)", q: { drugs: ["קוקאין", "חשיש"], mode: "and" } },
  { name: "קוקאין או חשיש ≥ 30 (OR)", q: { drugs: ["קוקאין", "חשיש"], mode: "or", min: 30 } },
  { name: "קוקאין וגם חשיש ≥ 30 (AND)", q: { drugs: ["קוקאין", "חשיש"], mode: "and", min: 30 } },
  { name: "כל 10 הסמים (OR) ≥ 1 — בדיקת תקרת 3000", q: { drugs: DRUGS, mode: "or", min: 1 } },
  // ── quantity in COUNTABLE units (the half of the corpus never weighed) ──
  { name: "LSD ≥ 1 בולים", q: { drugs: ["LSD"], min: 1, unit: "n" } },
  { name: "LSD ≥ 100 בולים", q: { drugs: ["LSD"], min: 100, unit: "n" } },
  { name: "MDMA ≥ 1 כדורים", q: { drugs: ["MDMA"], min: 1, unit: "n" } },
  { name: "MDMA ≥ 500 כדורים", q: { drugs: ["MDMA"], min: 500, unit: "n" } },
  { name: "קנאביס ≥ 50 שתילים", q: { drugs: ["קנאביס"], min: 50, unit: "n" } },
  { name: "בופרנורפין ≥ 1 כדורים", q: { drugs: ["בופרנורפין"], min: 1, unit: "n" } },
  {
    name: "LSD או MDMA ≥ 50 יחידות (OR)",
    q: { drugs: ["LSD", "MDMA"], mode: "or", min: 50, unit: "n" },
  },
  // ── quantity without a drug ──
  { name: "כמות ≥ 30 ללא סם", q: { min: 30 } },
  { name: "כמות ≥ 1000 ללא סם", q: { min: 1000 } },
  // ── interaction with other filters ──
  {
    name: "קוקאין ≥ 30 + הודה באשמה",
    q: { drugs: ["קוקאין"], min: 30 },
    raw: { "meta.confessed": "true" },
    extra: (d) => d.confessed === "true",
    note: "האם המסלול המתואם משמר את שאר הסינונים",
  },
  {
    name: "קוקאין ≥ 30 + טווח שנים 2022–2024",
    q: { drugs: ["קוקאין"], min: 30 },
    raw: { "meta.document_date": { from: "2022-01-01", to: "2024-12-31" } },
    extra: (d) => !!d.date && d.date >= "2022-01-01" && d.date <= "2024-12-31",
  },
  {
    name: 'קוקאין ≥ 30 + חיפוש טקסט "מעצר"',
    q: { drugs: ["קוקאין"], min: 30 },
    params: { text: "מעצר" },
    groundTruth: false,
    note: "text_query לא מועבר למסלול ה-bulk המתואם",
  },
  {
    name: 'קוקאין בלבד + חיפוש טקסט "מעצר"',
    q: { drugs: ["קוקאין"] },
    params: { text: "מעצר" },
    groundTruth: false,
  },
];

/* ═══════════════ phase A/B — live search ═══════════════ */

interface Row {
  name: string;
  api: number | null;
  impl: number;
  intent: number;
  ms: number;
  cache: string;
  status: number;
  violations: number;
  checked: number;
  gt: boolean;
  note?: string;
}

async function runApiPhase(corpus: CorpusDoc[]): Promise<Row[]> {
  const rows: Row[] = [];
  say(`\n## שלב א׳ — חיפושי סם × כמות מול ה-API (${BASE})\n`);
  say("| # | תרחיש | API | צפוי (קוד) | צפוי (כוונת המשתמש) | פריטים שנבדקו | הפרות | זמן | cache |");
  say("|---|---|----|----|----|----|----|----|----|");
  let i = 0;
  for (const s of SCENARIOS) {
    i++;
    const q: Query & { raw?: Record<string, unknown> } = { ...s.q, raw: s.raw };
    const params: Record<string, string> = { page: "1", ...(s.params ?? {}) };
    const uf = userFilters(q);
    if (uf !== "{}") params.userFilters = uf;
    const r = await api(params);
    const apiTotal = typeof r.json?.total === "number" ? r.json.total : null;

    // Verify each returned card actually satisfies the request.
    let violations = 0;
    const checked = Array.isArray(r.json?.rulings) ? r.json.rulings.length : 0;
    const badExamples: string[] = [];
    for (const item of r.json?.rulings ?? []) {
      const f = item.fields ?? {};
      const doc: CorpusDoc = {
        id: item.id,
        case_name: null, date: null,
        totals: f["meta.drug_totals"],
        detail: f["sql.פירוט_עבירות_סמים"],
        drug_types: f["meta.drug_types"],
        max_grams: f["meta.drug_max_grams"],
        // The per-drug totals the route actually filters on, unprefixed to
        // match the corpus shape. Leaving these out made the count-unit
        // scenarios report every returned card as a violation, because
        // implCounts had nothing to read.
        per_drug_g: Object.fromEntries(
          Object.entries(f)
            .filter(([k]) => k.startsWith("meta.drug_total_"))
            .map(([k, val]) => [k.slice("meta.".length), val]),
        ),
      };
      if (!matchImpl(doc, s.q)) {
        violations++;
        if (badExamples.length < 3) badExamples.push(`${item.id} (${item.caseName})`);
      }
    }
    const gt = s.groundTruth !== false;
    const impl = gt ? countImpl(corpus, { ...s.q, extra: s.extra }) : -1;
    const intent = gt ? countIntent(corpus, { ...s.q, extra: s.extra }) : -1;
    rows.push({
      name: s.name, api: apiTotal, impl, intent, ms: r.ms, cache: r.cache,
      status: r.status, violations, checked, gt, note: s.note,
    });
    const flag = apiTotal == null ? "❌" : !gt ? "" : apiTotal === impl ? "" : " ⚠️";
    say(
      `| ${i} | ${s.name} | ${apiTotal ?? `שגיאה ${r.status}`}${flag} | ${gt ? impl : "—"} | ${gt ? intent : "—"} | ${checked} | ${violations || ""} | ${(r.ms / 1000).toFixed(1)}s | ${r.cache} |`,
    );
    if (badExamples.length) say(`|  | ↳ תוצאות שאינן עומדות בסינון: ${badExamples.join(", ")} | | | | | | | |`);
  }
  return rows;
}

/* pagination + stability invariants (a few extra live calls) */
async function runInvariants() {
  say(`\n## שלב ב׳ — בדיקות עקביות (חוקיות בסיסית של הסינון)\n`);
  const checks: string[] = [];

  // 1. pagination: page 1 vs page 2 must not overlap and must cover `total`.
  const q: Query = { drugs: ["קוקאין"], min: 30 };
  const p1 = await api({ page: "1", userFilters: userFilters(q) });
  const p2 = await api({ page: "2", userFilters: userFilters(q) });
  const ids1 = new Set((p1.json?.rulings ?? []).map((x: any) => x.id));
  const ids2 = (p2.json?.rulings ?? []).map((x: any) => x.id);
  const overlap = ids2.filter((id: number) => ids1.has(id));
  checks.push(
    `**עימוד** — קוקאין ≥30: עמוד 1 = ${ids1.size} פריטים, עמוד 2 = ${ids2.length}, חפיפה = ${overlap.length} ` +
      (overlap.length ? "❌" : "✅") + ` (total=${p1.json?.total})`,
  );

  // 2. monotonicity in the threshold.
  const mins = [0, 30, 100, 1000];
  const counts: number[] = [];
  for (const m of mins) {
    const r = await api({ page: "1", userFilters: userFilters({ drugs: ["קוקאין"], min: m }) });
    counts.push(typeof r.json?.total === "number" ? r.json.total : -1);
  }
  const mono = counts.every((c, i) => i === 0 || c <= counts[i - 1]);
  checks.push(
    `**מונוטוניות** — קוקאין ≥ ${mins.join(" / ≥ ")} → ${counts.join(" / ")} ${mono ? "✅" : "❌ (סף גבוה יותר החזיר יותר תוצאות)"}`,
  );

  // 3. OR ⊇ each single, AND ⊆ each single.
  const setQueries: Query[] = [
    { drugs: ["קוקאין"] },
    { drugs: ["חשיש"] },
    { drugs: ["קוקאין", "חשיש"], mode: "or" },
    { drugs: ["קוקאין", "חשיש"], mode: "and" },
  ];
  const setTotals: number[] = [];
  for (const sq of setQueries) {
    const r = await api({ page: "1", userFilters: userFilters(sq) });
    setTotals.push(typeof r.json?.total === "number" ? r.json.total : -1);
  }
  const [ta, tb, tor, tand] = setTotals;
  checks.push(
    `**OR/AND** — קוקאין=${ta}, חשיש=${tb}, OR=${tor}, AND=${tand} → ` +
      (tor >= Math.max(ta, tb) && tor <= ta + tb ? "OR תקין ✅" : "OR שגוי ❌") + ", " +
      (tand <= Math.min(ta, tb) ? "AND תקין ✅" : "AND שגוי ❌") + ", " +
      (tor === ta + tb - tand ? "הכלה-הדחה מדויקת ✅" : `הכלה-הדחה: OR+AND=${tor + tand} מול סכום=${ta + tb} ⚠️`),
  );

  // 4. adding a drug filter must never ADD documents to a quantity-only result.
  const qtyOnly = await api({ page: "1", userFilters: userFilters({ min: 1000 }) });
  const qtyDrug = await api({ page: "1", userFilters: userFilters({ drugs: ["קנאביס"], min: 1000 }) });
  const t1 = qtyOnly.json?.total ?? -1, t2 = qtyDrug.json?.total ?? -1;
  checks.push(
    `**צמצום** — "≥1000 גרם" = ${t1}, "קנאביס ≥1000 גרם" = ${t2} → ` +
      (t2 <= t1 ? "✅ מצמצם" : `❌ הוספת סם הגדילה את התוצאות ב-${t2 - t1} (סמנטיקה שונה: מקסימום-רכיב מול סכום-סם)`),
  );

  for (const c of checks) say(`- ${c}`);
  return checks;
}

/* ═══════════════ phase C — totals vs detail reconciliation ═══════════════ */

interface Recon {
  kind: string;
  docs: Set<number>;
  examples: { id: number; msg: string }[];
}

function runAudit(corpus: CorpusDoc[]) {
  say(`\n## שלב ג׳ — התאמה בין טבלת הסיכום (meta.drug_totals) לפירוט (sql.פירוט_עבירות_סמים)\n`);
  const kinds = new Map<string, Recon>();
  const bump = (kind: string, id: number, msg: string) => {
    let r = kinds.get(kind);
    if (!r) kinds.set(kind, (r = { kind, docs: new Set(), examples: [] }));
    r.docs.add(id);
    if (r.examples.length < 4) r.examples.push({ id, msg });
  };

  let docsWithBoth = 0;
  let exactDocs = 0;
  for (const d of corpus) {
    const detail = arr(d.detail);
    const totals = arr(d.totals);
    if (!detail.length && !totals.length) continue;
    docsWithBoth++;
    let clean = true;

    // 1. numeric reconciliation per canonical drug (grams only).
    const impl = implGrams(d);
    const intent = intentGrams(d);
    for (const [drug, want] of intent) {
      const got = impl.get(drug);
      if (got == null) {
        // summary has no grams row for a drug the detail quantifies in grams
        clean = false;
        bump(
          "סם עם כמות בגרמים בפירוט — אך ללא שורת גרמים בסיכום",
          d.id,
          `${drug}: פירוט=${want.toFixed(2)} גרם, בסיכום אין שורת גרם`,
        );
        continue;
      }
      // TAG-IT rounds totals to 3 decimals — tolerate that, not more.
      const diff = Math.abs(got - want);
      if (diff <= Math.max(0.005, want * 0.002)) continue;
      clean = false;
      const ratio = want === 0 ? Infinity : got / want;
      const kind =
        Math.abs(ratio - 0.001) < 1e-6 ? "סיכום קטן פי 1000 (ק״ג לא הומר לגרם)"
        : Math.abs(ratio - 1000) < 1e-3 ? "סיכום גדול פי 1000"
        : Math.abs(ratio - Math.round(ratio)) < 1e-6 && ratio > 1 ? `סיכום כפול (×${Math.round(ratio)}) — ספירה כפולה`
        : got < want ? "סיכום נמוך מסכום הפירוט (שורות שלא נספרו)"
        : "סיכום גבוה מסכום הפירוט (שורות עודפות)";
      bump(kind, d.id, `${drug}: סיכום=${got} מול פירוט=${want.toFixed(2)}`);
    }
    // 2. summary rows that the detail can't explain at all.
    for (const [drug, got] of impl) {
      if (!intent.has(drug) && canonDrugsAll(drug).length) {
        clean = false;
        bump("שורת גרמים בסיכום ללא כמות מקבילה בפירוט", d.id, `${drug}: סיכום=${got}, בפירוט אין כמות בגרמים`);
      }
    }
    // 3. alias not merged — summary keeps two rows that are the same drug.
    const canonSeen = new Map<string, string[]>();
    for (const row of totals) {
      const raw = String(row["סוג_הסם"] ?? "");
      for (const c of canonDrugsAll(raw)) {
        const list = canonSeen.get(c) ?? [];
        if (!list.includes(raw)) list.push(raw);
        canonSeen.set(c, list);
      }
    }
    for (const [c, raws] of canonSeen) {
      if (raws.length > 1) {
        clean = false;
        bump("כינויים שלא אוחדו בסיכום (אותו סם בשתי שורות)", d.id, `${c}: ${raws.join(" / ")}`);
      }
    }
    // 4. detail rows with a quantity but a unit the summary can't total.
    const nonMass = detail.filter(
      (e) => num(e["מספר_כמות"]) != null && gramFactor(e["יחידת_מידה"]) == null,
    );
    if (nonMass.length) {
      const units = [...new Set(nonMass.map((e) => String(e["יחידת_מידה"] ?? "")))];
      bump("כמות ביחידה שאינה מסה (לא נכנסת לסינון בגרמים)", d.id, `יחידות: ${units.join(", ")}`);
      // not a "dirty" doc by itself — reported separately
    }
    // 5. detail rows with no numeric quantity at all.
    const nonNum = detail.filter((e) => num(e["מספר_כמות"]) == null);
    if (nonNum.length) bump("שורות פירוט ללא כמות מספרית", d.id, `${nonNum.length} שורות`);

    if (clean) exactDocs++;
  }

  say(`נבדקו **${docsWithBoth}** גזרי דין (כל קורפוס עמוד הסמים).`);
  say(`התאמה מלאה בין הסיכום לפירוט: **${exactDocs}** (${pct(exactDocs, docsWithBoth)}).\n`);
  say("| סוג אי-התאמה | מסמכים | % | דוגמאות |");
  say("|---|---|---|---|");
  for (const r of [...kinds.values()].sort((a, b) => b.docs.size - a.docs.size)) {
    const ex = r.examples.map((e) => `\`${e.id}\` ${e.msg}`).join("; ");
    say(`| ${r.kind} | ${r.docs.size} | ${pct(r.docs.size, docsWithBoth)} | ${ex} |`);
  }
  return kinds;
}

/* ═══════════════ root cause of the inflated totals ═══════════════ */

function runDoubleCountAnalysis(corpus: CorpusDoc[]) {
  say(`\n### ניתוח שורש — מדוע הסיכום גדול מהפירוט\n`);
  // For every (doc, drug) whose summary total is an integer multiple of the
  // detail sum, compare: the multiplier, the number of defendants, and
  // מספר_רכיבים (the row count TAG-IT says it summed) vs the rows we can see.
  const byMult = new Map<number, number>();
  const multVsDefendants = new Map<string, number>();
  let partsMatch = 0, partsInflated = 0, partsFewer = 0;
  const examples: string[] = [];

  for (const d of corpus) {
    const impl = implGrams(d), intent = intentGrams(d);
    const detail = arr(d.detail);
    for (const [drug, want] of intent) {
      const got = impl.get(drug);
      if (got == null || want <= 0) continue;
      const ratio = got / want;
      if (Math.abs(ratio - 1) < 0.002) continue;
      const k = Math.round(ratio);
      if (k < 2 || Math.abs(ratio - k) > 0.002) continue;
      byMult.set(k, (byMult.get(k) ?? 0) + 1);
      const nd = d.defendants ?? 0;
      const key = `×${k} · ${nd} נאשמים`;
      multVsDefendants.set(key, (multVsDefendants.get(key) ?? 0) + 1);
      // rows we can see for this drug, in grams
      const seen = detail.filter(
        (e) => canonDrugsAll(e["סוג_הסם"]).includes(drug) && num(e["מספר_כמות"]) != null && gramFactor(e["יחידת_מידה"]) != null,
      ).length;
      const row = arr(d.totals).find((t) => t["סוג_הסם"] === drug && t["יחידה"] === "גרם");
      const parts = num(row?.["מספר_רכיבים"]);
      if (parts != null) {
        if (parts === seen) partsMatch++;
        else if (parts > seen) partsInflated++;
        else partsFewer++;
      }
      if (examples.length < 6) {
        examples.push(
          `\`${d.id}\` ${drug}: פירוט ${seen} שורות = ${want.toFixed(3)} גרם · סיכום ${got} גרם (מספר_רכיבים=${parts}) · ${d.defendants ?? "?"} נאשמים · ×${k}`,
        );
      }
    }
  }
  const total = [...byMult.values()].reduce((a, b) => a + b, 0);
  say(`צמדי (מסמך × סם) שבהם הסיכום הוא כפולה שלמה של הפירוט: **${total}**`);
  say(`\nהתפלגות המכפיל: ` + [...byMult].sort((a, b) => b[1] - a[1]).map(([k, n]) => `×${k}: ${n}`).join(" · "));
  say(
    `\nהשוואת \`מספר_רכיבים\` (מה ש-TAG-IT טוען שסכם) מול מספר שורות הפירוט הנראות: ` +
      `זהה ${partsMatch} · גדול יותר ${partsInflated} · קטן יותר ${partsFewer}`,
  );
  say(`\nהצלבה מול מספר הנאשמים:`);
  for (const [k, n] of [...multVsDefendants].sort((a, b) => b[1] - a[1]).slice(0, 12)) say(`- ${k}: ${n}`);
  say(`\nדוגמאות:`);
  for (const e of examples) say(`- ${e}`);
}

/* ═══════════════ coverage of the quantity filter ═══════════════ */

function runCoverage(corpus: CorpusDoc[]) {
  say(`\n## שלב ד׳ — כיסוי הסינון לפי כמות (כמה מסמכים "בלתי נראים" לסינון)\n`);
  say("| סם | מסמכים עם הסם | יש סה״כ בגרמים | מסונן החוצה בכל סינון כמות | יחידות אחרות שנפוצות |");
  say("|---|---|---|---|---|");
  for (const drug of DRUGS) {
    const withDrug = corpus.filter((d) => strs(d.drug_types).includes(drug));
    const withGrams = withDrug.filter((d) => implGrams(d).has(drug));
    const units = new Map<string, number>();
    for (const d of withDrug) {
      if (implGrams(d).has(drug)) continue;
      for (const row of arr(d.totals)) {
        if (canonDrugsAll(row["סוג_הסם"]).includes(drug)) {
          const u = String(row["יחידה"] ?? "");
          units.set(u, (units.get(u) ?? 0) + 1);
        }
      }
    }
    const topUnits = [...units].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([u, n]) => `${u} (${n})`).join(", ");
    say(
      `| ${drug} | ${withDrug.length} | ${withGrams.length} | ${withDrug.length - withGrams.length} (${pct(withDrug.length - withGrams.length, withDrug.length)}) | ${topUnits || "—"} |`,
    );
  }
}

/* ═══════════════ main ═══════════════ */

async function main() {
  const corpus = loadCorpus();
  const startedAt = new Date().toISOString();
  say(`# בנצ'מרק חיפוש סמים — /drug-sentencing`);
  say(`\nהורץ: ${new Date().toISOString()} · יעד: ${BASE} · קורפוס: ${corpus.length} גזרי דין (מהמראה המקומי).`);

  let rows: Row[] = [];
  if (PHASE === "all" || PHASE === "api") {
    rows = await runApiPhase(corpus);
    await runInvariants();
  }
  if (PHASE === "all" || PHASE === "audit") {
    runAudit(corpus);
    runDoubleCountAnalysis(corpus);
    runCoverage(corpus);
  }

  if (rows.length) {
    const mism = rows.filter((r) => r.gt && r.api != null && r.api !== r.impl);
    const semantic = rows.filter((r) => r.gt && r.impl !== r.intent);
    say(`\n## סיכום\n`);
    say(`- תרחישים שהורצו: ${rows.length}`);
    say(`- פערים מול הסמנטיקה של הקוד (באג בצנרת): **${mism.length}**`);
    say(`- פערים בין הקוד לכוונת המשתמש (באג בנתונים/אגרגציה): **${semantic.length}**`);
    say(`- תוצאות שהוחזרו ואינן עומדות בסינון: **${rows.reduce((n, r) => n + r.violations, 0)}** מתוך ${rows.reduce((n, r) => n + r.checked, 0)} שנבדקו`);
    const slow = rows.filter((r) => r.ms > 15000);
    if (slow.length) say(`- שאילתות איטיות (>15s): ${slow.map((s) => `${s.name} (${(s.ms / 1000).toFixed(0)}s)`).join(", ")}`);
    if (failures.length) {
      say(`- כשלי שרת (5xx/רשת) במהלך הריצה: **${failures.length}**`);
      for (const f of failures.slice(0, 10)) {
        say(`  - סטטוס ${f.status} · \`${decodeURIComponent(f.params.userFilters ?? "")}\``);
      }
    }
    const crashes = await renderCrashes(startedAt);
    if (crashes.length) {
      say(`- **המופע בפרודקשן נפל במהלך הבנצ'מרק** (${crashes.length} פעמים):`);
      for (const c of crashes) say(`  - ${c}`);
    }
  }

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, out.join("\n"));
  console.log(`\n✓ report → ${REPORT}`);
}

main();
