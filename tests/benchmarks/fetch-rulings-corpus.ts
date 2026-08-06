/**
 * Pull the defamation + FOI page corpora from the TAG-IT local mirror, reduced
 * to the values each page's filters actually address.
 *
 * The drug corpus could be cached whole; these scopes can't (scope 4 alone is
 * ~13k documents of deeply nested analysis). So the extraction happens in SQL,
 * one jsonb path per configured filter key — lax mode, which auto-unwraps an
 * array crossed on the way down, exactly like the mirror's own compiled
 * filters. That keeps the cache small AND keeps the offline model comparing
 * the same values the database compares.
 *
 * Usage:  npx tsx tests/benchmarks/fetch-rulings-corpus.ts
 */
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { PAGES, type FilterField, type SlimDoc } from "./rulings-pages-model";

export const CORPUS_DIR =
  process.env.RULINGS_CORPUS_DIR ||
  "C:/Users/zomer/AppData/Local/Temp/claude/C--Users-zomer-CLAUDE-CODE-Z-G/ab4509da-7ec8-46bc-b463-9754f02ec667/scratchpad";

export const corpusFile = (slug: string) => `${CORPUS_DIR}/rulings-corpus-${slug}.json`;
export const configFile = (slug: string) => `${CORPUS_DIR}/rulings-config-${slug}.json`;

/** Dotted filter key → a lax jsonpath over the mirrored document. */
function jsonPath(key: string): string {
  const segs = key.split(".");
  return "$" + segs.map((s) => `."${s.replace(/"/g, '\\"')}"`).join("");
}

/**
 * The page's base filter as SQL. Only the two shapes these pages actually use:
 * an allowedDocTypes OR-of-contains over the title, and foi-costs' not_null.
 * Anything else aborts rather than silently benchmarking the wrong corpus.
 */
function baseWhere(content: Record<string, unknown>): string {
  const q = (content.query ?? {}) as Record<string, unknown>;
  const custom = q.customQuery as { op?: string; field?: string } | null;
  const docTypes = (content.allowedDocTypes ?? []) as string[];
  if (custom) {
    if (custom.op === "not_null" && custom.field) {
      const p = jsonPath(custom.field);
      return `jsonb_path_exists(data, '${p} ? (@ != null)')`;
    }
    throw new Error(`unsupported customQuery shape: ${JSON.stringify(custom)}`);
  }
  if (docTypes.length) {
    const ors = docTypes
      .map((t) => `(data->'ai'->>'כותרת_המסמך') ILIKE '%' || ${quote(t)} || '%'`)
      .join(" OR ");
    return `(${ors})`;
  }
  return "TRUE";
}

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  mkdirSync(CORPUS_DIR, { recursive: true });

  for (const page of PAGES) {
    const row = await prisma.page.findUnique({ where: { slug: page.slug } });
    const content = (row?.content ?? {}) as Record<string, unknown>;
    const q = (content.query ?? {}) as Record<string, unknown>;
    const fields = (q.filterFields ?? []) as FilterField[];
    const scopeId = (q.scope as number) || page.scopeId;

    const cols = fields
      .map((f, i) => `jsonb_path_query_array(data, '${jsonPath(f.key)}') AS v${i}`)
      .join(",\n           ");
    const sql = `
      SELECT doc_id AS id${cols ? ",\n           " + cols : ""}
        FROM tagit_docs
       WHERE scope_id = ${scopeId} AND ${baseWhere(content)}`;

    const t0 = Date.now();
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
    const docs: SlimDoc[] = rows.map((r) => {
      const v: Record<string, unknown> = {};
      fields.forEach((f, i) => {
        const raw = r[`v${i}`];
        // jsonb_path_query_array always wraps; unwrap a single scalar so the
        // model can tell "one value" from "crossed an array".
        const a = Array.isArray(raw) ? raw : [];
        v[f.key] = a.length === 1 ? a[0] : a;
      });
      return { id: Number(r.id), v };
    });

    // Field kinds from TAG-IT's own catalog — the same source the mirror
    // compiles `contains` against, and the only place that says whether
    // ai.שופטים is an array (exact-element) or a scalar (substring). A field
    // absent from the catalog is a filter pointed at nothing.
    const stateRows = await prisma.$queryRawUnsafe<{ field_schema: unknown }[]>(
      `SELECT field_schema FROM "tagit_sync_state" WHERE scope_id = ${scopeId}`,
    );
    const catalog = (stateRows[0]?.field_schema ?? []) as { key: string; type?: string }[];
    const byKey = new Map(catalog.map((c) => [c.key, String(c.type ?? "")]));
    const kinds: Record<string, "array" | "scalar"> = {};
    const uncataloged: string[] = [];
    for (const f of fields) {
      const t = byKey.get(f.key);
      if (t === undefined) uncataloged.push(f.key);
      kinds[f.key] = t && t.includes("[]") ? "array" : "scalar";
    }

    writeFileSync(corpusFile(page.slug), JSON.stringify(docs));
    writeFileSync(
      configFile(page.slug),
      JSON.stringify({
        scopeId, pageSize: q.pageSize ?? 24, fields, kinds, uncataloged,
        declaredTypes: Object.fromEntries(fields.map((f) => [f.key, byKey.get(f.key) ?? null])),
      }),
    );
    console.log(
      `✓ ${page.slug.padEnd(20)} ${String(docs.length).padStart(6)} docs, ` +
        `${fields.length} filters  (${((Date.now() - t0) / 1000).toFixed(1)}s)` +
        (uncataloged.length ? `  ⚠️ ${uncataloged.length} not in catalog` : ""),
    );
  }
  await prisma.$disconnect();
}

main();
