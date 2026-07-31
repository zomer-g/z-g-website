/**
 * Server-startup hook (Next.js instrumentation).
 *
 * Deliberately empty of scheduled work.
 *
 * This used to schedule the TAG-IT mirror sync in-process: bootstrap ~2 min
 * after boot, incremental every 15 min, full resync nightly. That was cheap to
 * write but it ran the walk inside the 512 MB Render web instance, which under
 * normal traffic already sits at ~95% of its limit (cached corpora + Next.js
 * baseline). The sync's allocations were what pushed it over: every OOM kill
 * between 2026-07-23 and 2026-07-31 landed inside a sync window, four of them
 * within 62 seconds of a scheduled tick, and the nightly full walk alone pulls
 * 293 MB of JSON for scope 1.
 *
 * The schedule now lives in .github/workflows/rulings-mirror-sync.yml, running
 * scripts/rulings-mirror-sync.ts on a runner against the same production
 * database — the same move ca-sync made for the conditional-arrangements CSV.
 *
 * POST /api/rulings/sync still triggers a sync in this process for a deliberate
 * admin-initiated run; keep using the workflow for anything routine.
 */
export async function register() {
  // Intentionally a no-op.
}
