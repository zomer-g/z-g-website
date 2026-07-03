/**
 * Server-startup hook (Next.js instrumentation).
 *
 * Schedules the TAG-IT mirror sync in-process — the Render web service is a
 * single long-lived Node instance, so a plain interval is the cheapest
 * reliable scheduler (no external cron, survives as long as the process).
 *
 *  • ~2 min after boot: bootstrap — if a scope has never completed a full
 *    sync, run a full sync for it (first deploy fills the mirror by itself).
 *  • every 15 min: incremental sync (newest-uploaded pages per scope).
 *  • nightly ~03:10 Asia/Jerusalem: full resync (picks up re-analyzed docs,
 *    prunes deletions).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Skip during `next build` (route analysis imports this too).
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { syncAllScopes, mirrorStates, isSyncRunning, mirrorScopes } =
    await import("@/lib/rulings-mirror");

  const INCREMENTAL_EVERY_MS = 15 * 60_000;
  const BOOT_DELAY_MS = 2 * 60_000;
  const FULL_SYNC_HOUR_IL = 3; // 03:xx Israel time

  function ilHour(): number {
    return parseInt(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Asia/Jerusalem",
      }).format(new Date()),
      10,
    );
  }

  let lastFullSyncDay = "";

  async function tick() {
    if (isSyncRunning()) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (ilHour() === FULL_SYNC_HOUR_IL && lastFullSyncDay !== today) {
        lastFullSyncDay = today;
        console.log("rulings-mirror: nightly full sync starting");
        await syncAllScopes("full");
        return;
      }
      // "auto" = incremental for ready scopes, full-with-resume for scopes
      // whose bootstrap walk hasn't completed yet (TAG-IT 502s interrupt it).
      await syncAllScopes("auto");
    } catch (err) {
      console.error("rulings-mirror: scheduled sync failed:", err);
    }
  }

  setTimeout(async () => {
    try {
      // Bootstrap: any scope without a completed full sync gets one now.
      const states = await mirrorStates().catch(() => []);
      const synced = new Set(
        states.filter((s) => s.lastFullSyncAt).map((s) => s.scopeId),
      );
      const hasUnsynced = mirrorScopes().some((id) => !synced.has(id));
      if (hasUnsynced && !isSyncRunning()) {
        console.log("rulings-mirror: bootstrap full sync starting");
        await syncAllScopes("auto").catch((err) =>
          console.error("rulings-mirror: bootstrap sync failed:", err),
        );
      }
    } finally {
      setInterval(tick, INCREMENTAL_EVERY_MS);
    }
  }, BOOT_DELAY_MS);

  console.log("rulings-mirror: scheduler registered");
}
