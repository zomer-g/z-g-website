/**
 * Capture TAG-IT's field catalog for the mirrored scopes into
 * tagit_sync_state.field_schema (used by the mirror's filter compiler for
 * exact array/scalar semantics). Safe to re-run any time.
 * Usage: DATABASE_URL=... CLASS_ACTION_API_KEY=... npx tsx scripts/capture-tagit-schema.ts [scopeId...]
 */
import { prisma } from "../src/lib/prisma";
import { fetchUpstreamRulingsSchema } from "../src/lib/rulings-upstream";
import { mirrorScopes } from "../src/lib/rulings-mirror";

async function main() {
  const args = process.argv.slice(2).map((s) => parseInt(s, 10)).filter(Boolean);
  const scopes = args.length ? args : mirrorScopes();
  for (const scopeId of scopes) {
    const fields = await fetchUpstreamRulingsSchema(scopeId);
    if (!fields) {
      console.log(`scope ${scopeId}: schema fetch failed (kept existing)`);
      continue;
    }
    await prisma.tagitSyncState.upsert({
      where: { scopeId },
      create: { scopeId, fieldSchema: fields as object },
      update: { fieldSchema: fields as object },
    });
    const arrays = fields.filter((f) => f.type?.endsWith("[]")).length;
    console.log(
      `scope ${scopeId}: stored ${fields.length} fields (${arrays} array-typed)`,
    );
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
