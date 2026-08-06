/* eslint-disable @typescript-eslint/no-explicit-any -- reads untyped API JSON */
/**
 * Filter benchmark for the other TAG-IT-backed pages (defamation + FOI).
 *
 * Same idea as the drug benchmark, generalised: instead of one hand-written
 * ground truth, it derives the scenarios from each page's own filter config
 * and scores every one against the filter semantics implemented in
 * rulings-pages-model.ts over the mirrored corpus.
 *
 * What it is actually looking for — the failure mode these pages are prone to
 * is not a wrong number, it is a SILENT ZERO. A filter whose label promises a
 * free-text search but whose field is a GIN array answers only exact full
 * values; a dropdown matched with `eq` against noisy court strings matches
 * nothing. Both look identical to "there are no such judgments". So every
 * scenario is generated from a value that DOES exist in the corpus, and any
 * filter that then returns zero is reported as dead rather than empty.
 *
 * Usage:
 *   npx tsx tests/benchmarks/fetch-rulings-corpus.ts     # refresh the caches
 *   npx tsx tests/benchmarks/rulings-pages-benchmark.ts
 *   BENCH_BASE_URL=http://localhost:3000 npx tsx …
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import {
  PAGES, expectedCount, leaves, matchesField,
  type FieldKinds, type FilterField, type FilterValue, type SlimDoc,
} from "./rulings-pages-model";
import { corpusFile, configFile } from "./fetch-rulings-corpus";

const BASE = (process.env.BENCH_BASE_URL || "https://www.z-g.co.il").replace(/\/$/, "");
const MIN_INTERVAL_MS = Number(process.env.BENCH_INTERVAL_MS || 2600);
const REQ_TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS || 120_000);
const REPORT = process.env.BENCH_REPORT || "tests/benchmarks/RULINGS-PAGES-REPORT.md";

const out: string[] = [];
const say = (s = "") => { console.log(s); out.push(s); };
const pct = (a: number, b: number) => (b === 0 ? "—" : `${((a / b) * 100).toFixed(0)}%`);

/* ═══════════ paced API client ═══════════ */

let lastCall = 0;
const failures: string[] = [];
const staticFindings: string[] = [];

async function api(category: string, params: Record<string, string>) {
  const wait = Math.max(0, lastCall + MIN_INTERVAL_MS - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const u = new URL(`${BASE}/api/rulings`);
  u.searchParams.set("category", category);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await fetch(u.toString(), { signal: ctl.signal, headers: { Accept: "application/json" } });
    const json: any = await res.json().catch(() => ({}));
    return { status: res.status, ms: Date.now() - t0, json };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, json: { error: String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

/* ═══════════ scenario generation ═══════════ */

interface Scenario {
  field: FilterField;
  name: string;
  filters: Record<string, FilterValue>;
  /** what this case is probing, for the report */
  probe: string;
}

/** Most frequent non-empty leaf values for a field across the corpus. */
function topValues(corpus: SlimDoc[], key: string, n = 8): string[] {
  const freq = new Map<string, number>();
  for (const d of corpus) {
    for (const l of leaves(d.v[key])) {
      const s = String(l).trim();
      if (s && s.length < 120) freq.set(s, (freq.get(s) ?? 0) + 1);
    }
  }
  return [...freq].sort((a, b) => b[1] - a[1]).slice(0, n).map(([s]) => s);
}

function numericValues(corpus: SlimDoc[], key: string): number[] {
  const out: number[] = [];
  for (const d of corpus) {
    for (const l of leaves(d.v[key])) {
      const n = typeof l === "number" ? l : Number(String(l).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out.sort((a, b) => a - b);
}

function dateValues(corpus: SlimDoc[], key: string): string[] {
  const out: string[] = [];
  for (const d of corpus) {
    for (const l of leaves(d.v[key])) {
      const s = String(l).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) out.push(s);
    }
  }
  return out.sort();
}

function scenariosFor(f: FilterField, corpus: SlimDoc[]): Scenario[] {
  const s: Scenario[] = [];
  const mk = (name: string, value: FilterValue, probe: string) =>
    s.push({ field: f, name, filters: { [f.key]: value }, probe });

  if (f.control === "text") {
    const [top] = topValues(corpus, f.key, 1);
    if (top) {
      mk(`${f.label} = "${top}"`, top, "ערך מלא מדויק");
      // A partial is what a user actually types. On an array-valued field
      // `contains` is exact-element, so this is the case that exposes a box
      // that silently demands the whole value.
      const part = top.length > 6 ? top.slice(Math.floor(top.length / 3), Math.floor(top.length / 3) + 5).trim() : "";
      if (part && part.length >= 3) mk(`${f.label} ~ "${part}" (חלקי)`, part, "חיפוש חלקי");
    }
  } else if (f.control === "select") {
    const opts = f.options?.length ? f.options : topValues(corpus, f.key, 4);
    for (const o of opts.slice(0, 4)) mk(`${f.label} = "${o}"`, o, "אפשרות מהרשימה");
  } else if (f.control === "multiselect") {
    const opts = f.options?.length ? f.options : topValues(corpus, f.key, 3);
    if (opts[0]) mk(`${f.label} ⊇ ${opts[0]}`, [opts[0]], "בחירה יחידה");
    if (opts[1]) mk(`${f.label} ⊇ {${opts[0]},${opts[1]}} (OR)`, [opts[0], opts[1]], "OR");
  } else if (f.control === "boolean") {
    mk(`${f.label} = כן`, "true", "בוליאני חיובי");
    mk(`${f.label} = לא`, "false", "בוליאני שלילי");
  } else if (f.control === "number") {
    const vals = numericValues(corpus, f.key);
    if (vals.length) {
      const med = vals[Math.floor(vals.length / 2)];
      mk(`${f.label} ≥ ${med}`, { min: med }, "חצי עליון");
      mk(`${f.label} ≤ ${med}`, { max: med }, "חצי תחתון");
    }
  } else if (f.control === "date" || f.control === "yearrange") {
    const ds = dateValues(corpus, f.key);
    if (ds.length) {
      const from = ds[Math.floor(ds.length * 0.25)];
      const to = ds[Math.floor(ds.length * 0.75)];
      mk(`${f.label} ${from}…${to}`, { from, to }, "טווח תאריכים");
    }
  }
  return s;
}

/* ═══════════ per-item verification ═══════════ */

/**
 * Resolve a dotted filter key against an API item's flattened `fields`.
 * The route flattens nested OBJECTS into dotted keys but leaves arrays whole,
 * so a path that crosses an array of objects has no flat entry — walk it.
 */
function resolveField(fields: Record<string, unknown>, key: string): unknown {
  if (key in fields) return fields[key];
  const segs = key.split(".");
  for (let cut = segs.length - 1; cut >= 1; cut--) {
    const head = segs.slice(0, cut).join(".");
    if (!(head in fields)) continue;
    let cur: unknown = fields[head];
    for (const seg of segs.slice(cut)) {
      if (Array.isArray(cur)) {
        cur = cur.map((x) => (x && typeof x === "object" ? (x as any)[seg] : undefined))
                 .filter((x) => x !== undefined);
      } else if (cur && typeof cur === "object") {
        cur = (cur as any)[seg];
      } else return undefined;
    }
    return cur;
  }
  return undefined;
}

/* ═══════════ run ═══════════ */

interface Row {
  page: string; name: string; probe: string;
  api: number | null; expected: number; ms: number;
  checked: number; violations: number; verdict: string;
}

async function runPage(spec: typeof PAGES[number], rows: Row[]) {
  const cfg = JSON.parse(readFileSync(configFile(spec.slug), "utf8")) as {
    fields: FilterField[]; pageSize: number; kinds: FieldKinds;
    uncataloged: string[]; declaredTypes: Record<string, string | null>;
  };
  const corpus = loadCorpus(spec.slug);
  say(`\n## ${spec.label} — \`/${spec.slug}\` (scope ${spec.scopeId}, ${corpus.length} מסמכים בקורפוס)\n`);

  const base = await api(spec.category, { page: "1" });
  const baseTotal = typeof base.json?.total === "number" ? base.json.total : null;
  const baseVerdict = baseTotal === corpus.length ? "✅" : "⚠️";
  say(`בסיס ללא סינון: API=${baseTotal ?? "שגיאה"} · צפוי=${corpus.length} ${baseVerdict}\n`);
  if (baseTotal == null) failures.push(`${spec.slug}: base query failed (${base.status})`);

  // ── static audit: filters that cannot work, whatever the user types ──
  const staticIssues: string[] = [];
  for (const f of cfg.fields) {
    const declared = cfg.declaredTypes[f.key];
    const populated = corpus.filter((d) => leaves(d.v[f.key]).length > 0).length;
    if (declared === null) {
      staticIssues.push(
        `🔴 **${f.label}** (\`${f.key}\`) — השדה לא קיים בקטלוג של TAG-IT; הסינון מצביע על כלום (${populated}/${corpus.length} מסמכים עם ערך)`,
      );
    } else if (populated === 0) {
      staticIssues.push(`🔴 **${f.label}** (\`${f.key}\`) — אין ולו מסמך אחד בקורפוס עם ערך בשדה`);
    } else if (f.control === "text" && cfg.kinds[f.key] === "array") {
      staticIssues.push(
        `🟠 **${f.label}** (\`${f.key}\`) — תיבת טקסט חופשי מעל שדה מטיפוס \`${declared}\`: ` +
        `\`contains\` על מערך הוא התאמה מדויקת, ולכן חיפוש חלקי תמיד יחזיר 0`,
      );
    } else if (f.control === "select" && declared === "boolean") {
      staticIssues.push(
        `🔴 **${f.label}** (\`${f.key}\`) — שדה בוליאני מאחורי פקד \`select\`: הפקד שולח מחרוזת "true", ` +
        `והשוואת jsonpath היא מוקפדת-טיפוס, ולכן לעולם לא תהיה התאמה. הפקד צריך להיות \`boolean\``,
      );
    }
  }
  if (staticIssues.length) {
    say(`**בדיקת תצורה:**`);
    for (const i of staticIssues) say(`- ${i}`);
    staticFindings.push(...staticIssues.map((i) => `${spec.label} · ${i}`));
    say("");
  }

  say("| סינון | מה נבדק | API | צפוי | נבדקו | הפרות | זמן | מסקנה |");
  say("|---|---|---|---|---|---|---|---|");

  for (const f of cfg.fields) {
    for (const sc of scenariosFor(f, corpus)) {
      const r = await api(spec.category, {
        page: "1",
        userFilters: JSON.stringify(sc.filters),
      });
      const apiTotal = typeof r.json?.total === "number" ? r.json.total : null;
      const expected = expectedCount(corpus, cfg.fields, sc.filters, cfg.kinds);

      let violations = 0;
      const items = Array.isArray(r.json?.rulings) ? r.json.rulings : [];
      for (const item of items) {
        const fields = (item.fields ?? {}) as Record<string, unknown>;
        const doc: SlimDoc = { id: item.id, v: { [f.key]: resolveField(fields, f.key) } };
        if (!matchesField(doc, f, sc.filters[f.key]!, cfg.kinds)) violations++;
      }

      let verdict: string;
      if (apiTotal == null) { verdict = `❌ שגיאה ${r.status}`; failures.push(`${spec.slug}/${sc.name}: HTTP ${r.status}`); }
      else if (apiTotal === 0 && expected === 0) verdict = "⬜ אין התאמות בכלל";
      else if (apiTotal === 0 && expected > 0) verdict = "🔴 מחזיר 0 למרות שיש התאמות";
      else if (apiTotal === expected) verdict = violations ? "⚠️ ספירה תואמת, פריטים לא" : "✅";
      else if (expected > 0 && apiTotal / expected < 0.5) verdict = `🔴 חסרים ${pct(expected - apiTotal, expected)}`;
      else verdict = `⚠️ פער ${apiTotal - expected}`;

      rows.push({
        page: spec.label, name: sc.name, probe: sc.probe,
        api: apiTotal, expected, ms: r.ms,
        checked: items.length, violations, verdict,
      });
      say(
        `| ${sc.name} | ${sc.probe} | ${apiTotal ?? "—"} | ${expected} | ${items.length} | ` +
        `${violations || ""} | ${(r.ms / 1000).toFixed(1)}s | ${verdict} |`,
      );
    }
  }

  // ── invariants ──
  say(`\n**בדיקות עקביות:**`);
  const p1 = await api(spec.category, { page: "1" });
  const p2 = await api(spec.category, { page: "2" });
  const ids1 = new Set((p1.json?.rulings ?? []).map((x: any) => x.id));
  const overlap = (p2.json?.rulings ?? []).filter((x: any) => ids1.has(x.id));
  say(`- עימוד: עמוד 1 = ${ids1.size}, עמוד 2 = ${(p2.json?.rulings ?? []).length}, חפיפה = ${overlap.length} ${overlap.length ? "❌" : "✅"}`);

  const dateField = cfg.fields.find((f) => f.control === "date");
  if (dateField) {
    const ds = dateValues(corpus, dateField.key);
    if (ds.length > 10) {
      const mid = ds[Math.floor(ds.length / 2)];
      const a = await api(spec.category, { page: "1", userFilters: JSON.stringify({ [dateField.key]: { from: ds[0] } }) });
      const b = await api(spec.category, { page: "1", userFilters: JSON.stringify({ [dateField.key]: { from: mid } }) });
      const ta = a.json?.total ?? -1, tb = b.json?.total ?? -1;
      say(`- מונוטוניות תאריך: מ-${ds[0]} → ${ta}, מ-${mid} → ${tb} ${tb <= ta ? "✅" : "❌"}`);
    }
  }
  return rows;
}

function loadCorpus(slug: string): SlimDoc[] {
  return JSON.parse(readFileSync(corpusFile(slug), "utf8")) as SlimDoc[];
}

async function main() {
  say(`# בנצ'מרק סינונים — עמודי TAG-IT הנוספים`);
  say(`\nהורץ: ${new Date().toISOString()} · יעד: ${BASE}`);
  say(
    `\nכל תרחיש נבנה מערך שקיים בפועל בקורפוס, ומושווה לסמנטיקת הסינון ` +
    `(rulings-pages-model.ts) המחושבת על המראה המקומי. סינון שמחזיר 0 כשיש התאמות ` +
    `אמיתיות מסומן כ-🔴 — זו התקלה שנראית למשתמש כמו "אין תוצאות".`,
  );

  const rows: Row[] = [];
  for (const spec of PAGES) await runPage(spec, rows);

  if (staticFindings.length) {
    say(`
## ממצאי תצורה (לא תלויי-שאילתה)
`);
    for (const f of staticFindings) say(`- ${f}`);
  }
  const dead = rows.filter((r) => r.verdict.startsWith("🔴"));
  const off = rows.filter((r) => r.verdict.startsWith("⚠️"));
  const ok = rows.filter((r) => r.verdict === "✅");
  say(`\n## סיכום\n`);
  say(`- תרחישים: ${rows.length} · תקינים: **${ok.length}** · חשודים: **${off.length}** · שבורים: **${dead.length}**`);
  say(`- פריטים שנבדקו: ${rows.reduce((n, r) => n + r.checked, 0)} · הפרות: **${rows.reduce((n, r) => n + r.violations, 0)}**`);
  if (dead.length) {
    say(`\n**סינונים שבורים (מחזירים 0 בזמן שיש התאמות):**`);
    for (const r of dead) say(`- ${r.page} · ${r.name} — צפוי ${r.expected}, קיבלנו ${r.api}`);
  }
  if (off.length) {
    say(`\n**פערים לבדיקה:**`);
    for (const r of off.slice(0, 15)) say(`- ${r.page} · ${r.name} — API ${r.api}, צפוי ${r.expected}${r.violations ? `, ${r.violations} פריטים לא תואמים` : ""}`);
  }
  if (failures.length) {
    say(`\n**כשלי רשת/שרת:** ${failures.length}`);
    for (const f of failures.slice(0, 8)) say(`- ${f}`);
  }
  const slow = rows.filter((r) => r.ms > 15000);
  if (slow.length) say(`\n**שאילתות איטיות (>15s):** ${slow.map((s) => `${s.name} (${(s.ms / 1000).toFixed(0)}s)`).join(", ")}`);

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, out.join("\n"));
  console.log(`\n✓ report → ${REPORT}`);
}

main();
