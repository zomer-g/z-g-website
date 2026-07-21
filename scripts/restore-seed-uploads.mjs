// Repopulates the persistent uploads disk with the git-committed seed files.
//
// On Render the `public/uploads` directory is a *persistent disk* (see
// render.yaml). A fresh disk starts empty, which would hide the seed media
// thumbnails that ship in the repo. This script copies anything from
// `public/seed-uploads/` (part of the build image, never mounted over) into
// `public/uploads/` when it's missing. It runs on every `npm start` and is
// idempotent — existing files (including runtime uploads) are never touched.
//
// Runtime user uploads live on the same persistent disk, so they now survive
// deploys and restarts instead of being wiped.

import { readdir, copyFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const SEED_DIR = path.join(process.cwd(), "public", "seed-uploads");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(SEED_DIR))) {
    // Nothing to restore from — leave the uploads dir as-is.
    return;
  }
  await mkdir(UPLOADS_DIR, { recursive: true });

  const files = await readdir(SEED_DIR);
  let restored = 0;
  for (const name of files) {
    const dest = path.join(UPLOADS_DIR, name);
    if (await exists(dest)) continue; // don't clobber runtime uploads
    await copyFile(path.join(SEED_DIR, name), dest);
    restored++;
  }
  if (restored > 0) {
    console.log(`[restore-seed-uploads] restored ${restored} seed file(s) to public/uploads`);
  }
}

main().catch((err) => {
  // A restore failure must not block the server from starting.
  console.error("[restore-seed-uploads] failed:", err);
});
