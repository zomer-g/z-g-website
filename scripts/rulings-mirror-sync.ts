/**
 * TAG-IT mirror sync runner — for a dev machine or the rulings-mirror-sync
 * GitHub Action, NEVER the Render web process.
 *
 * WHY OUT-OF-PROCESS: this used to run on a 15-minute setInterval inside the
 * Next.js server (src/instrumentation.ts). The 512 MB Starter instance already
 * sits at ~95% of its limit under normal traffic, so the sync's transient
 * allocations were what tipped it over: every OOM kill between 2026-07-23 and
 * 2026-07-31 landed inside a sync window, four of them within 62 seconds of a
 * scheduled tick. The nightly full walk is far worse — scope 1 alone is 557
 * pages / 293 MB of JSON. Same reasoning (and same fix) as ca-sync-local.ts.
 *
 * Usage:
 *   npx tsx scripts/rulings-mirror-sync.ts              # auto (incremental, or
 *                                                       #   full-with-resume for
 *                                                       #   un-bootstrapped scopes)
 *   npx tsx scripts/rulings-mirror-sync.ts --mode full  # nightly full walk + prune
 *
 * Env: DATABASE_URL, RULINGS_API_KEY (or CLASS_ACTION_API_KEY),
 *      optionally TAGIT_API_URL, TAGIT_MIRROR_SCOPES, TAGIT_MIRROR_PAGE_SIZE.
 */
import "dotenv/config";

type Mode = "auto" | "full" | "incremental";

function parseMode(): Mode {
  const i = process.argv.indexOf("--mode");
  const raw = i >= 0 ? process.argv[i + 1] : undefined;
  if (raw === "full" || raw === "incremental" || raw === "auto") return raw;
  if (raw) throw new Error(`unknown --mode ${raw} (auto|full|incremental)`);
  return "auto";
}

async function main() {
  const mode = parseMode();
  if (!process.env.RULINGS_API_KEY && !process.env.CLASS_ACTION_API_KEY) {
    throw new Error("RULINGS_API_KEY (or CLASS_ACTION_API_KEY) is not set");
  }
  const { syncAllScopes, mirrorScopes } = await import(
    "../src/lib/rulings-mirror"
  );
  const t0 = Date.now();
  console.log(
    `rulings-mirror-sync: starting mode=${mode} scopes=${mirrorScopes().join(",")}`,
  );

  const results = await syncAllScopes(mode);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);

  for (const r of results) {
    console.log(
      `  scope ${r.scopeId} [${r.mode}] ${r.ok ? "ok" : "FAILED"} — ` +
        `${r.pagesFetched} pages, ${r.docsUpserted} upserted, ` +
        `${r.docsPruned} pruned, upstream total ${r.upstreamTotal ?? "?"}` +
        (r.error ? ` — ${r.error}` : ""),
    );
  }

  // A scope failing is normal-ish (TAG-IT 502s / times out) and the next run
  // retries it, but the job should still go red so the failures stay visible.
  const failed = results.filter((r) => !r.ok);
  console.log(
    `rulings-mirror-sync: done in ${secs}s — ${results.length - failed.length}/${results.length} scopes ok`,
  );
  if (failed.length > 0) {
    throw new Error(
      `${failed.length} scope(s) failed: ${failed.map((r) => r.scopeId).join(", ")}`,
    );
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("rulings-mirror-sync: FAILED:", err);
    process.exit(1);
  },
);
