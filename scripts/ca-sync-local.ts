/**
 * Conditional-arrangements sync runner — for a dev machine or the ca-sync
 * GitHub Action, NEVER the Render web process.
 *
 * WHY OUT-OF-PROCESS: streaming the police R2 CSV (~255 MB) needs ~200 MB RSS
 * on its own; on 2026-07-17 the in-process weekly re-sync OOM-crashed the
 * 512 MB Starter instance twice in a row (container OOM, then V8 heap OOM at
 * the 350 MB --max-old-space-size cap), each time after deleting the police
 * records it was about to replace. The web app now only DETECTS staleness;
 * this script does the actual work with a normal-sized heap.
 *
 * Usage:
 *   npx tsx scripts/ca-sync-local.ts            # version-check (only changed sources)
 *   npx tsx scripts/ca-sync-local.ts --force    # full re-download of all sources
 */
import "dotenv/config";

// The lib refuses to sync unless this is set — we're not the 512MB web box.
process.env.CA_SYNC_IN_PROCESS = "1";

async function main() {
  const { forceSync, syncVersionCheck } = await import(
    "../src/lib/conditional-arrangements-db"
  );
  const force = process.argv.includes("--force");
  const t0 = Date.now();
  console.log(`ca-sync-local: starting (${force ? "force" : "version-check"})`);
  const counts = force ? await forceSync() : await syncVersionCheck();
  console.log(
    `ca-sync-local: done in ${((Date.now() - t0) / 1000).toFixed(0)}s —`,
    counts,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("ca-sync-local: FAILED:", err);
    process.exit(1);
  },
);
