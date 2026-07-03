/**
 * Seed / refresh the TAG-IT local mirror from the developer machine.
 * DATABASE_URL points at prod, so running this locally pre-populates the
 * mirror before (or between) deploys.
 *
 * Usage:
 *   DATABASE_URL=... CLASS_ACTION_API_KEY=... npx tsx scripts/seed-tagit-mirror.ts [full|incremental] [scopeId]
 */
import { syncScope, mirrorScopes, mirrorStates } from "../src/lib/rulings-mirror";

async function main() {
  const mode = process.argv[2] === "incremental" ? "incremental" : "full";
  const onlyScope = process.argv[3] ? parseInt(process.argv[3], 10) : null;
  const scopes = onlyScope ? [onlyScope] : mirrorScopes();
  console.log(`seed-tagit-mirror: mode=${mode} scopes=${scopes.join(",")}`);
  for (const scopeId of scopes) {
    const t0 = Date.now();
    const res = await syncScope(scopeId, mode);
    console.log(
      `scope ${scopeId}: ok=${res.ok} pages=${res.pagesFetched} upserted=${res.docsUpserted} pruned=${res.docsPruned} total=${res.upstreamTotal} in ${Math.round((Date.now() - t0) / 1000)}s${res.error ? " error=" + res.error : ""}`,
    );
  }
  console.log("state:", JSON.stringify(await mirrorStates(), null, 1));
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
