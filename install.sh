#!/bin/sh
# xhostd build step: runs once per deploy, as root, with NO env and NO database.
# Render does not read this file; it keeps using render.yaml's buildCommand.
#
# Render's build also ran `prisma db push` and prisma/ensure-dashboard-content.ts.
# Both need the database, so they moved to launch.sh. Every page is
# force-dynamic, so `next build` reads no data — but importing src/lib/prisma.ts
# throws when DATABASE_URL is unset, so the build gets a placeholder that
# nothing ever connects to.
set -eu
export DATABASE_URL="postgresql://build:build@127.0.0.1:1/build"
export NEXT_TELEMETRY_DISABLED=1

npm ci --include=dev

# Seed uploads go into public/uploads BEFORE the build, so next start serves
# them as static files. At boot the app runs as `app` and could not write into
# this root-owned tree anyway.
node scripts/restore-seed-uploads.mjs

npx next build

# The image optimizer writes its cache under .next/cache at run time.
mkdir -p .next/cache
chmod -R a+rwX .next/cache
