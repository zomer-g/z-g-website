/**
 * Parity check: run representative queries (the same shapes the rulings
 * route builds for each page) against BOTH the local mirror and live TAG-IT,
 * and compare ids/totals/order. Requires DATABASE_URL + CLASS_ACTION_API_KEY.
 *
 * Usage: npx tsx scripts/verify-tagit-mirror.ts
 */
import { queryMirrorPage } from "../src/lib/rulings-mirror";
import { fetchUpstreamRulingsPage } from "../src/lib/rulings-upstream";
import type { FilterExpression } from "../src/types/ruling-filter";

interface Case {
  name: string;
  scopeId: number;
  filter: FilterExpression | null;
  sortKey: string | null; // mirror form (no "-")
  sortDesc: boolean;
  size?: number;
}

const CASES: Case[] = [
  {
    // foi-judgments default: allowedDocTypes base filter, default order
    name: "foi-judgments default",
    scopeId: 6,
    filter: {
      op: "or",
      clauses: [
        { field: "ai.כותרת_המסמך", op: "contains", value: "פסק דין" },
        { field: "ai.כותרת_המסמך", op: "contains", value: 'פס"ד' },
      ],
    },
    sortKey: null,
    sortDesc: true,
  },
  {
    // foi-costs: not_null base + amount sort
    name: "foi-costs by amount desc",
    scopeId: 6,
    filter: { op: "not_null", field: "sql.סכום_הוצאות_שקלים" },
    sortKey: "sql.סכום_הוצאות_שקלים",
    sortDesc: true,
  },
  {
    // foi-judgments + user boolean filter
    name: "foi boolean filter",
    scopeId: 6,
    filter: {
      op: "and",
      clauses: [
        {
          op: "or",
          clauses: [
            { field: "ai.כותרת_המסמך", op: "contains", value: "פסק דין" },
            { field: "ai.כותרת_המסמך", op: "contains", value: 'פס"ד' },
          ],
        },
        { field: "ai.האם_הורו_על_מסירת_מידע", op: "eq", value: true },
      ],
    },
    sortKey: null,
    sortDesc: true,
  },
  {
    // crossed-array scalar text filter (defamation-style, on scope 6 law field)
    name: "foi crossed-array law contains",
    scopeId: 6,
    filter: {
      field: "sql.טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי",
      op: "contains",
      value: "חופש המידע",
    },
    sortKey: null,
    sortDesc: true,
  },
  {
    // date range on promoted meta column
    name: "foi date range",
    scopeId: 6,
    filter: {
      op: "and",
      clauses: [
        { field: "meta.document_date", op: "ge", value: "2024-01-01" },
        { field: "meta.document_date", op: "le", value: "2024-12-31" },
      ],
    },
    sortKey: null,
    sortDesc: true,
  },
];

function toUpstreamSort(c: Case): string | undefined {
  if (!c.sortKey) return undefined;
  return (c.sortDesc ? "-" : "") + c.sortKey;
}

async function main() {
  let failures = 0;
  for (const c of CASES) {
    const size = c.size ?? 10;
    const filterJson = c.filter ? JSON.stringify(c.filter) : undefined;
    const t0 = Date.now();
    const mirror = await queryMirrorPage({
      scopeId: c.scopeId,
      page: 1,
      size,
      filter: c.filter,
      sortKey: c.sortKey,
      sortDesc: c.sortDesc,
    });
    const tMirror = Date.now() - t0;
    const t1 = Date.now();
    const upstream = await fetchUpstreamRulingsPage({
      scopeId: c.scopeId,
      page: 1,
      size,
      filterJson,
      sortKey: toUpstreamSort(c),
      timeoutMs: 180_000,
    });
    const tUp = Date.now() - t1;
    if (!upstream) {
      console.log(`✗ ${c.name}: upstream unavailable (no API key?)`);
      failures++;
      continue;
    }
    const mIds = mirror.items.map((i) => i.id);
    const uIds = upstream.items.map((i) => i.id);
    const sameTotal = mirror.total === upstream.total;
    const sameSet =
      JSON.stringify([...mIds].sort()) === JSON.stringify([...uIds].sort());
    const sameOrder = JSON.stringify(mIds) === JSON.stringify(uIds);
    const ok = sameTotal && sameSet;
    if (!ok) failures++;
    console.log(
      `${ok ? "✓" : "✗"} ${c.name}: mirror total=${mirror.total} (${tMirror}ms) | upstream total=${upstream.total} (${tUp}ms) | sameSet=${sameSet} sameOrder=${sameOrder}`,
    );
    if (!sameSet) {
      console.log(`   mirror ids:   ${mIds.join(",")}`);
      console.log(`   upstream ids: ${uIds.join(",")}`);
    }
  }
  console.log(failures === 0 ? "ALL OK" : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
