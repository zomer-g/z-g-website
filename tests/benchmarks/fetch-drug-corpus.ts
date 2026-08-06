/**
 * Pull the drug-sentencing corpus (scope 1, base filter) from the TAG-IT local
 * mirror into a local JSON cache, so the benchmark can compute ground truth
 * offline (no rate limit, no per-query Neon round-trip).
 *
 * Usage:  npx tsx tests/benchmarks/fetch-drug-corpus.ts [outFile]
 */
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export const CORPUS_FILE =
  process.env.DRUG_CORPUS_FILE ||
  "C:/Users/zomer/AppData/Local/Temp/claude/C--Users-zomer-CLAUDE-CODE-Z-G/ab4509da-7ec8-46bc-b463-9754f02ec667/scratchpad/drug-corpus.json";

// Mirrors scripts/drug-sentencing-config.ts customQuery.
const BASE_SQL = `
  scope_id = 1
  AND data->'meta'->'topics' ? 'סמים'
  AND (data->'meta'->>'has_drug_type') = 'true'
`;

export interface CorpusDoc {
  id: number;
  case_name: string;
  date: string;
  totals: unknown;        // meta.drug_totals
  detail: unknown;        // sql.פירוט_עבירות_סמים
  drug_types: unknown;    // meta.drug_types
  max_grams: unknown;     // meta.drug_max_grams
  per_drug_g: Record<string, unknown>; // meta.drug_total_g_* + meta.drug_total_n_*
}

async function main() {
  const out = process.argv[2] || CORPUS_FILE;
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const t0 = Date.now();
  const rows = await prisma.$queryRawUnsafe<CorpusDoc[]>(
    `SELECT doc_id AS id,
            data->'meta'->>'case_name'        AS case_name,
            data->'meta'->>'document_date'    AS date,
            data->'meta'->'drug_totals'       AS totals,
            data->'sql'->'פירוט_עבירות_סמים'  AS detail,
            data->'meta'->'drug_types'        AS drug_types,
            data->'meta'->'drug_max_grams'    AS max_grams,
            (SELECT jsonb_object_agg(k, v)
               FROM jsonb_each(data->'meta') AS kv(k, v)
              WHERE k LIKE 'drug_total_%')    AS per_drug_g,
            CASE WHEN jsonb_typeof(data->'sql'->'נאשמים') = 'array'
                 THEN jsonb_array_length(data->'sql'->'נאשמים') END AS defendants,
            (data->'meta'->>'confessed')::text AS confessed
       FROM tagit_docs
      WHERE ${BASE_SQL}`,
  );
  await prisma.$disconnect();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(rows));
  console.log(`✓ ${rows.length} docs → ${out}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
