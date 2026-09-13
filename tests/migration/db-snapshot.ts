/**
 * Database fingerprint for the migration: per-table row counts and content
 * hashes, index names, extensions, and sequence health. Take one of the source
 * right before the dump and one of the target right after the restore, then
 * diff the pair with compare.ts.
 *
 *   npm run test:migration:db -- --label db-render                  # DATABASE_URL from .env
 *   SNAPSHOT_DATABASE_URL=postgresql://… npm run test:migration:db -- --label db-xhostd
 *
 * Read-only: everything runs in one REPEATABLE READ READ ONLY transaction, so
 * counts and hashes describe a single consistent moment.
 *
 * Hashes: tables up to --full-mb (default 300) are hashed row by row — the md5
 * of each row's text form, sorted, hashed again. Larger tables hash only their
 * primary keys. Session settings that change a row's text form (time zone,
 * date style, float digits, bytea output) are pinned so both sides render rows
 * the same way. A column-order difference also changes the full hash, which is
 * intended: restore the schema from the dump, not from `prisma db push`.
 *
 * The GitHub sync workflows rewrite tagit_docs, guideline_* and ca_records.
 * Pause them before taking the pair you compare, or those tables will differ.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { type DbRun, type DbSequence, type DbTable, parseArgs } from "./lib";

interface PgClient {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

// pg ships no types in this project; load it untyped behind a minimal interface.
const { Client } = createRequire(path.resolve("package.json"))("pg") as {
  Client: new (cfg: { connectionString: string; ssl: false | { rejectUnauthorized: boolean } }) => PgClient;
};

const ident = (name: string): string => `"${name.replace(/"/g, '""')}"`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const label = typeof args.label === "string" ? args.label : "";
  const url = process.env.SNAPSHOT_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!label || !url) {
    console.error("usage: [SNAPSHOT_DATABASE_URL=…] tsx tests/migration/db-snapshot.ts --label name [--full-mb 300] [--out DIR]");
    process.exit(2);
  }
  const fullBytes = Number(typeof args["full-mb"] === "string" ? args["full-mb"] : 300) * 1024 * 1024;
  const outDir = path.resolve(typeof args.out === "string" ? args.out : "tests/migration/results");
  const host = new URL(url).hostname;
  const noSsl = /sslmode=disable/.test(url) || host === "localhost" || host === "127.0.0.1";

  const client = new Client({ connectionString: url, ssl: noSsl ? false : { rejectUnauthorized: false } });
  await client.connect();
  const q = async (sql: string, params?: unknown[]) => (await client.query(sql, params)).rows;
  const startedAt = new Date().toISOString();
  console.log(`[db-snapshot] ${label}: ${host}`);

  await q("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  for (const s of [
    "SET LOCAL TimeZone = 'UTC'",
    "SET LOCAL DateStyle = 'ISO, YMD'",
    "SET LOCAL IntervalStyle = 'postgres'",
    "SET LOCAL extra_float_digits = 1",
    "SET LOCAL bytea_output = 'hex'",
    "SET LOCAL statement_timeout = '20min'",
  ]) {
    await q(s);
  }

  const version = String((await q("select version() as v"))[0].v);
  const database = String((await q("select current_database() as d"))[0].d);
  const extensions = (await q("select extname || '@' || extversion as e from pg_extension order by 1")).map((r) => String(r.e));

  const tableRows = await q(
    `select c.relname as name, pg_total_relation_size(c.oid) as bytes
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
      order by c.relname`,
  );

  const tables: DbTable[] = [];
  for (const t of tableRows) {
    const name = String(t.name);
    const bytes = Number(t.bytes);
    const started = Date.now();
    const rows = Number((await q(`select count(*)::bigint as n from ${ident(name)}`))[0].n);
    const pk = (
      await q(
        `select a.attname
           from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
          where i.indrelid = $1::regclass and i.indisprimary
          order by array_position(i.indkey::int2[], a.attnum)`,
        [ident(name)],
      )
    ).map((r) => String(r.attname));

    let hashMode: DbTable["hashMode"] = "none";
    let rowExpr: string | null = null;
    if (bytes <= fullBytes) {
      hashMode = "full";
      rowExpr = "md5(t::text)";
    } else if (pk.length) {
      hashMode = "pk";
      rowExpr = `md5(row(${pk.map((c) => `t.${ident(c)}`).join(", ")})::text)`;
    }
    const hash = rowExpr
      ? String(
          (await q(`select md5(coalesce(string_agg(h, '' order by h collate "C"), '')) as h from (select ${rowExpr} as h from ${ident(name)} t) s`))[0].h,
        )
      : null;

    const indexes = (await q("select indexname from pg_indexes where schemaname = 'public' and tablename = $1 order by 1", [name])).map((r) =>
      String(r.indexname),
    );
    const hasSyncedAt = (await q("select 1 from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = 'synced_at'", [name])).length > 0;
    const maxSyncedAt = hasSyncedAt ? ((await q(`select max(synced_at)::text as m from ${ident(name)}`))[0].m as string | null) : null;

    tables.push({ name, rows, bytes, hashMode, hash, indexes, maxSyncedAt });
    console.log(`  ${name.padEnd(32)} ${String(rows).padStart(8)} rows  ${hashMode.padEnd(4)} ${hash ?? "-"}  ${Date.now() - started}ms`);
  }

  const seqRows = await q(
    `select s.relname as seq, t.relname as tbl, a.attname as col
       from pg_class s
       join pg_namespace n on n.oid = s.relnamespace and n.nspname = 'public'
       join pg_depend d on d.objid = s.oid and d.classid = 'pg_class'::regclass
                       and d.refclassid = 'pg_class'::regclass and d.deptype in ('a', 'i')
       join pg_class t on t.oid = d.refobjid
       join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
      where s.relkind = 'S'
      order by 1`,
  );
  const sequences: DbSequence[] = [];
  for (const s of seqRows) {
    const seq = await q(`select last_value, is_called from ${ident(String(s.seq))}`);
    const max = await q(`select max(${ident(String(s.col))})::bigint as m from ${ident(String(s.tbl))}`);
    // A sequence that was never called still hands out last_value next.
    const lastValue = seq[0].is_called ? Number(seq[0].last_value) : Number(seq[0].last_value) - 1;
    const maxValue = max[0].m === null ? null : Number(max[0].m);
    const ok = maxValue === null || lastValue >= maxValue;
    sequences.push({ name: String(s.seq), table: String(s.tbl), column: String(s.col), lastValue, maxValue, ok });
    console.log(`  seq ${String(s.seq).padEnd(28)} last ${lastValue}  max(${s.tbl}.${s.col}) ${maxValue}  ${ok ? "ok" : "BEHIND — next insert collides"}`);
  }

  await q("COMMIT");
  await client.end();

  const run: DbRun = { kind: "db", label, host, database, version, startedAt, finishedAt: new Date().toISOString(), extensions, tables, sequences };
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${label}.json`);
  writeFileSync(file, JSON.stringify(run, null, 2));
  console.log(`[db-snapshot] ${tables.length} tables, ${sequences.length} sequences → ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
