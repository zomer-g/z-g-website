/**
 * Quick smoke of the mirror query layer against whatever is already synced.
 * No upstream comparison — just proves the compiled SQL executes and returns
 * sensible rows. Usage: npx tsx scripts/smoke-mirror-query.ts
 */
import { queryMirrorPage, queryMirrorBulk } from "../src/lib/rulings-mirror";
import type { FilterExpression } from "../src/types/ruling-filter";

async function run(name: string, fn: () => Promise<unknown>) {
  const t0 = Date.now();
  try {
    const out = await fn();
    console.log(`✓ ${name} (${Date.now() - t0}ms):`, JSON.stringify(out).slice(0, 200));
  } catch (err) {
    console.log(`✗ ${name}:`, err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

async function main() {
  await run("default order page", async () => {
    const r = await queryMirrorPage({ scopeId: 6, page: 1, size: 3, filter: null });
    return { total: r.total, ids: r.items.map((i) => i.id) };
  });

  const docTypeFilter: FilterExpression = {
    op: "or",
    clauses: [
      { field: "ai.כותרת_המסמך", op: "contains", value: "פסק דין" },
      { field: "ai.כותרת_המסמך", op: "contains", value: 'פס"ד' },
    ],
  };
  await run("contains filter", async () => {
    const r = await queryMirrorPage({ scopeId: 6, page: 1, size: 3, filter: docTypeFilter });
    return { total: r.total, ids: r.items.map((i) => i.id) };
  });

  await run("not_null + numeric sort", async () => {
    const r = await queryMirrorPage({
      scopeId: 6,
      page: 1,
      size: 3,
      filter: { op: "not_null", field: "sql.סכום_הוצאות_שקלים" },
      sortKey: "sql.סכום_הוצאות_שקלים",
      sortDesc: true,
    });
    return {
      total: r.total,
      amounts: r.items.map(
        (i) => (i as Record<string, Record<string, unknown>>).sql?.["סכום_הוצאות_שקלים"],
      ),
    };
  });

  await run("boolean eq", async () => {
    const r = await queryMirrorPage({
      scopeId: 6,
      page: 1,
      size: 3,
      filter: { field: "ai.האם_הורו_על_מסירת_מידע", op: "eq", value: true },
    });
    return { total: r.total };
  });

  await run("crossed-array contains", async () => {
    const r = await queryMirrorPage({
      scopeId: 6,
      page: 1,
      size: 3,
      filter: {
        field: "sql.טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי",
        op: "contains",
        value: "חופש המידע",
      },
    });
    return { total: r.total };
  });

  await run("date range on meta column", async () => {
    const r = await queryMirrorPage({
      scopeId: 6,
      page: 1,
      size: 3,
      filter: {
        op: "and",
        clauses: [
          { field: "meta.document_date", op: "ge", value: "2024-01-01" },
          { field: "meta.document_date", op: "le", value: "2024-12-31" },
        ],
      },
    });
    return { total: r.total };
  });

  await run("bulk (law narrow)", async () => {
    const docs = await queryMirrorBulk({
      scopeId: 6,
      filter: {
        field: "sql.טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי",
        op: "contains",
        value: "חופש המידע",
      },
      limit: 500,
    });
    return { docs: docs.length };
  });

  await run("meta.id lookup", async () => {
    const r0 = await queryMirrorPage({ scopeId: 6, page: 1, size: 1, filter: null });
    const id = r0.items[0]?.id;
    const r = await queryMirrorPage({
      scopeId: 6,
      page: 1,
      size: 1,
      filter: { field: "meta.id", op: "eq", value: id },
    });
    return { lookedUp: id, got: r.items.map((i) => i.id), total: r.total };
  });
}

main();
