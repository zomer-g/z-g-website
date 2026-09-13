#!/bin/sh
# xhostd runtime step: runs at boot as user `app` with the full env. It must
# answer GET / on $XHOST_HTTP_PORT within 120 seconds, and exec so next
# receives stop signals. Render does not read this file.
set -eu
cd "$(dirname "$0")"

# Schema sync and dashboard defaults, moved here from Render's buildCommand
# because the build has no database. A failure is logged, not fatal: on a
# running site the schema is already in place, and refusing to boot over a
# no-op push would take the site down for nothing. RUN_MIGRATIONS=false skips
# both — for a second instance on the same database, or an empty database
# waiting for its restore.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npx prisma db push || echo "[launch] prisma db push FAILED; serving with the existing schema"
  npx tsx prisma/ensure-dashboard-content.ts || echo "[launch] ensure-dashboard-content FAILED"
fi

# Mirror syncs (TAG-IT rulings, guidelines, conditional arrangements), which
# ran as GitHub Actions while the database lived on Render. A separate process
# with its own heap, so a corpus walk can never push the web server into an
# OOM kill. Off unless SYNC_SCHEDULER=true: only the production instance runs it.
if [ "${SYNC_SCHEDULER:-false}" = "true" ]; then
  node --import tsx scripts/xhostd-sync-scheduler.ts &
fi

# Same heap cap as Render's start script unless overridden.
export NODE_OPTIONS="--max-old-space-size=${WEB_HEAP_MB:-256}"
exec node_modules/.bin/next start -p "$XHOST_HTTP_PORT" -H 0.0.0.0
