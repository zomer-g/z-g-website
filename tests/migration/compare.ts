/**
 * Diff two migration results — two HTTP runs (run.ts) or two DB snapshots
 * (db-snapshot.ts) — into a Markdown report.
 *
 *   npm run test:migration:compare -- tests/migration/results/t0-render.json tests/migration/results/t2-xhostd.json
 *
 * Writes compare-<before>-vs-<after>.md next to the second file (or --out).
 *
 * Perf verdicts need a change of more than 25% AND more than 150 ms before
 * they call a target slower or faster; below that, a home connection's noise
 * dominates. Two baseline runs compared with each other show the noise band.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type DbRun, type HttpRun, type SanityRecord, parseArgs } from "./lib";

const REL = 0.25;
const ABS_MS = 150;

const cell = (v: unknown): string => String(v ?? "–").replace(/\|/g, "\\|").replace(/\s+/g, " ").slice(0, 140);
const ms = (v: number | null | undefined): string => (v == null ? "–" : String(Math.round(v)));

function verdict(before: number | null | undefined, after: number | null | undefined): string {
  if (before == null || after == null) return "n/a";
  const delta = after - before;
  if (Math.abs(delta) < ABS_MS || Math.abs(delta) / Math.max(before, 1) < REL) return "≈";
  return delta > 0 ? "🔴 slower" : "🟢 faster";
}

function pct(before: number | null | undefined, after: number | null | undefined): string {
  if (before == null || after == null || before === 0) return "–";
  const p = ((after - before) / before) * 100;
  return `${p > 0 ? "+" : ""}${Math.round(p)}%`;
}

function compareHttp(a: HttpRun, b: HttpRun): string {
  const L: string[] = [];
  L.push(`# Migration check: \`${a.label}\` → \`${b.label}\``, "");
  L.push("| | before | after |", "|---|---|---|");
  L.push(`| base | ${a.base} | ${b.base} |`);
  L.push(`| resolved | ${a.resolved.join(", ")} | ${b.resolved.join(", ")} |`);
  L.push(`| edge (server header on /) | ${cell(a.sanity.find((s) => s.id === "home")?.headers.server)} | ${cell(b.sanity.find((s) => s.id === "home")?.headers.server)} |`);
  L.push(`| started | ${a.startedAt} | ${b.startedAt} |`, "");

  // --- sanity -------------------------------------------------------------
  const am = new Map(a.sanity.map((s) => [s.id, s]));
  const bm = new Map(b.sanity.map((s) => [s.id, s]));
  const ids = [...new Set([...b.sanity.map((s) => s.id), ...a.sanity.map((s) => s.id)])];
  const tally = (run: HttpRun) => {
    const skipped = run.sanity.filter((s) => s.skipped).length;
    const failed = run.sanity.filter((s) => !s.ok && !s.skipped).length;
    return `${run.sanity.length - skipped - failed}/${run.sanity.length - skipped} passed (${skipped} skipped)`;
  };
  const passed = (s: SanityRecord | undefined) => !!s && s.ok && !s.skipped;
  const failing = (s: SanityRecord | undefined) => !!s && !s.ok && !s.skipped;

  const regressions = ids.filter((id) => passed(am.get(id)) && !passed(bm.get(id)) && !bm.get(id)?.skipped);
  const fixed = ids.filter((id) => failing(am.get(id)) && passed(bm.get(id)));
  const still = ids.filter((id) => failing(am.get(id)) && failing(bm.get(id)));
  const newFailures = ids.filter((id) => !am.has(id) && failing(bm.get(id)));
  const fpDiffs = ids.filter((id) => {
    const x = am.get(id);
    const y = bm.get(id);
    return passed(x) && passed(y) && x!.fingerprint !== null && y!.fingerprint !== null && x!.fingerprint !== y!.fingerprint;
  });

  L.push("## Sanity", "", `- before: ${tally(a)}`, `- after: ${tally(b)}`, "");
  const sanityTable = (title: string, list: string[], note?: string) => {
    L.push(`### ${title} (${list.length})`, "");
    if (note) L.push(note, "");
    if (!list.length) {
      L.push("none", "");
      return;
    }
    L.push("| check | before | after | after detail |", "|---|---|---|---|");
    for (const id of list) {
      const x = am.get(id);
      const y = bm.get(id);
      L.push(`| ${cell(id)} | ${x ? `${x.status ?? "err"} ${x.ok ? "ok" : "fail"}` : "–"} | ${y ? `${y.status ?? "err"} ${y.ok ? "ok" : "fail"}` : "missing"} | ${cell(y?.detail)} |`);
    }
    L.push("");
  };
  sanityTable("🔴 Regressions — passed before, not after", regressions);
  sanityTable("New failures — checks that only exist in the after run", newFailures);
  sanityTable("🟢 Fixed — failed before, pass after", fixed);
  sanityTable("Failing in both runs", still);

  L.push(`### Fingerprint changes (${fpDiffs.length})`, "");
  L.push("Both runs passed but a value that should survive the move changed — a record count, a file hash, a page title. Counts on TAG-IT mirror routes move when a sync ran in between.", "");
  if (fpDiffs.length) {
    L.push("| check | before | after |", "|---|---|---|");
    for (const id of fpDiffs) L.push(`| ${cell(id)} | ${cell(am.get(id)!.fingerprint)} | ${cell(bm.get(id)!.fingerprint)} |`);
  } else {
    L.push("none");
  }
  L.push("");

  // --- perf ---------------------------------------------------------------
  const pa = new Map(a.perf.map((p) => [p.id, p]));
  L.push("## Performance", "");
  L.push(`Warm rounds: before ${a.rounds}, after ${b.rounds}. Verdict needs >${REL * 100}% and >${ABS_MS} ms; assets are judged on total time, everything else on TTFB.`, "");
  L.push(
    "| target | TTFB p50 before | after | Δ | TTFB p95 before | after | total p50 before | after | first hit before | after | errors b/a | verdict |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  const ratios: number[] = [];
  for (const y of b.perf) {
    const x = pa.get(y.id);
    const isAsset = y.id.startsWith("asset:");
    const bv = isAsset ? x?.warm.total?.p50 : x?.warm.ttfb?.p50;
    const av = isAsset ? y.warm.total?.p50 : y.warm.ttfb?.p50;
    if (bv && av) ratios.push(av / bv);
    L.push(
      `| ${cell(y.id)} | ${ms(x?.warm.ttfb?.p50)} | ${ms(y.warm.ttfb?.p50)} | ${pct(x?.warm.ttfb?.p50, y.warm.ttfb?.p50)} | ${ms(x?.warm.ttfb?.p95)} | ${ms(y.warm.ttfb?.p95)} | ${ms(x?.warm.total?.p50)} | ${ms(y.warm.total?.p50)} | ${ms(x?.first?.ttfbMs)} | ${ms(y.first?.ttfbMs)} | ${x?.warm.errors ?? "–"}/${y.warm.errors} | ${y.skipped ? "skipped" : verdict(bv, av)} |`,
    );
  }
  if (ratios.length) {
    const geo = Math.exp(ratios.reduce((s, r) => s + Math.log(r), 0) / ratios.length);
    L.push("", `**Geometric mean of after/before (p50): ×${geo.toFixed(2)}** over ${ratios.length} targets (below 1 = faster after).`);
  }
  L.push("");

  const ba = new Map(a.bursts.map((x) => [x.id, x]));
  L.push("## Parallel bursts", "", "| burst | TTFB p50 before | after | TTFB p95 before | after | burst wall p50 before | after | errors b/a |", "|---|---|---|---|---|---|---|---|");
  for (const y of b.bursts) {
    const x = ba.get(y.id);
    L.push(`| ${cell(`${y.id} (${y.parallel}×${y.bursts})`)} | ${ms(x?.ttfb?.p50)} | ${ms(y.ttfb?.p50)} | ${ms(x?.ttfb?.p95)} | ${ms(y.ttfb?.p95)} | ${ms(x?.wallMs?.p50)} | ${ms(y.wallMs?.p50)} | ${x?.errors ?? "–"}/${y.errors} |`);
  }
  L.push("");
  return L.join("\n");
}

function compareDb(a: DbRun, b: DbRun): string {
  const L: string[] = [];
  L.push(`# Database check: \`${a.label}\` → \`${b.label}\``, "");
  L.push("| | before | after |", "|---|---|---|");
  L.push(`| host | ${a.host} | ${b.host} |`);
  L.push(`| database | ${a.database} | ${b.database} |`);
  L.push(`| version | ${cell(a.version)} | ${cell(b.version)} |`);
  L.push(`| taken | ${a.startedAt} | ${b.startedAt} |`);
  L.push(`| extensions | ${a.extensions.join(", ")} | ${b.extensions.join(", ")} |`, "");

  const ta = new Map(a.tables.map((t) => [t.name, t]));
  const tb = new Map(b.tables.map((t) => [t.name, t]));
  const names = [...new Set([...a.tables.map((t) => t.name), ...b.tables.map((t) => t.name)])].sort();
  const problems: string[] = [];
  const rows: string[] = [];
  for (const n of names) {
    const x = ta.get(n);
    const y = tb.get(n);
    const sameRows = x && y && x.rows === y.rows;
    const sameHash = x && y && x.hashMode === y.hashMode && x.hash === y.hash;
    const sameIdx = x && y && x.indexes.join(",") === y.indexes.join(",");
    const status = !x ? "only after" : !y ? "🔴 missing after" : sameRows && sameHash && sameIdx ? "✓" : "🔴";
    if (status !== "✓") problems.push(n);
    rows.push(
      `| ${n} | ${x?.rows ?? "–"} | ${y?.rows ?? "–"} | ${x && y ? y.rows - x.rows : "–"} | ${y?.hashMode ?? x?.hashMode} | ${x && y ? (sameHash ? "same" : "differs") : "–"} | ${x && y ? (sameIdx ? "same" : `${x.indexes.length}→${y.indexes.length}`) : "–"} | ${status} |`,
    );
  }
  L.push(`## Tables — ${names.length - problems.length}/${names.length} identical`, "");
  if (problems.length) L.push(`Differences: ${problems.join(", ")}`, "");
  L.push("| table | rows before | rows after | Δ | hash mode | content | indexes | |", "|---|---|---|---|---|---|---|---|", ...rows, "");

  const behind = b.sequences.filter((s) => !s.ok);
  L.push(`## Sequences on the after side — ${b.sequences.length - behind.length}/${b.sequences.length} ahead of their column`, "");
  if (behind.length) {
    L.push("| sequence | last value | max in column |", "|---|---|---|");
    for (const s of behind) L.push(`| ${s.name} | ${s.lastValue} | ${s.table}.${s.column} = ${s.maxValue} |`);
  } else {
    L.push("All sequences are at or past the highest value in their column.");
  }
  L.push("");
  return L.join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const files = argv.filter((x, i) => !x.startsWith("--") && !(i > 0 && argv[i - 1] === "--out"));
  if (files.length !== 2) {
    console.error("usage: tsx tests/migration/compare.ts <before.json> <after.json> [--out report.md]");
    process.exit(2);
  }
  const [a, b] = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as HttpRun | DbRun);
  if (a.kind !== b.kind) {
    console.error(`cannot compare a ${a.kind} result with a ${b.kind} result`);
    process.exit(2);
  }
  const md = a.kind === "db" ? compareDb(a, b as DbRun) : compareHttp(a, b as HttpRun);
  const out = typeof args.out === "string" ? args.out : path.join(path.dirname(files[1]), `compare-${a.label}-vs-${b.label}.md`);
  writeFileSync(out, md);
  console.log(md);
  console.log(`\nwritten: ${out}`);
}

main();
