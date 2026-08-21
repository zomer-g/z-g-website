/**
 * Guidelines mirror sync runner — for a dev machine or the
 * guidelines-mirror-sync GitHub Action, NEVER the Render web process.
 *
 * WHY OUT-OF-PROCESS: the same reason rulings-mirror-sync.ts and ca-sync-local
 * .ts live here. The 512 MB Starter instance sits at ~95% of its limit under
 * normal traffic, and corpus walks inside it are what caused every OOM kill
 * between 2026-07-23 and 2026-07-31 (see src/instrumentation.ts). This walk
 * pulls 12,281 documents over 25 upstream pages and takes ~5-6 minutes; on a
 * runner with a normal heap that is uneventful.
 *
 * WHAT IT FIXES: the corpus cache in the web process is in-memory, so every
 * deploy emptied it and left /guidelines crawling upstream for minutes before
 * it could answer. On 2026-08-20 that cold window became a six-hour outage.
 * With the mirror populated, a restart costs a database read instead.
 *
 * Usage:
 *   npx tsx scripts/guidelines-mirror-sync.ts
 *
 * Env: DATABASE_URL, CLASS_ACTION_API_KEY (or GUIDELINES_API_KEY).
 */
import "dotenv/config";

async function main() {
  if (!process.env.GUIDELINES_API_KEY && !process.env.CLASS_ACTION_API_KEY) {
    throw new Error(
      "GUIDELINES_API_KEY (or CLASS_ACTION_API_KEY) is not set — nothing to authenticate with",
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — nowhere to write the mirror");
  }

  const { syncGuidelinesMirror } = await import("../src/lib/guidelines-mirror");

  console.log("guidelines-mirror-sync: starting full walk");
  const { mirrored, replaced, durationMs } = await syncGuidelinesMirror();
  console.log(
    `guidelines-mirror-sync: done — ${mirrored} mirrored (replaced ${replaced}), ${Math.round(
      durationMs / 1000,
    )}s`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("guidelines-mirror-sync failed:", err);
    process.exit(1);
  });
