/**
 * One-off: copy runtime uploads that exist only on the Render persistent disk
 * into the uploaded_files table, fetching each over HTTP from the live site.
 *
 *   npx tsx scripts/copy-uploads-to-db.ts            # dry run: report only
 *   npx tsx scripts/copy-uploads-to-db.ts --write    # insert the missing rows
 *
 * Env: DATABASE_URL (the database to write to), UPLOADS_BASE_URL (default
 * https://www.z-g.co.il — the site that still has the files).
 *
 * Candidates are the files the Media table points at — every upload creates a
 * Media row — minus the git-committed seed files, which ship with the build.
 * A 404 is reported and skipped: five such files were already gone from
 * Render before the move. Rows that already exist are left alone, so the
 * script can run again safely.
 */
import "dotenv/config";
import { readdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const BASE = (process.env.UPLOADS_BASE_URL || "https://www.z-g.co.il").replace(/\/$/, "");
const WRITE = process.argv.includes("--write");

function seedNames(): Set<string> {
  const names = new Set<string>();
  for (const dir of ["public/seed-uploads", "public/uploads"]) {
    try {
      for (const n of readdirSync(path.resolve(dir))) names.add(n);
    } catch {
      // directory absent in this checkout
    }
  }
  return names;
}

async function main() {
  const seeds = seedNames();
  const media = await prisma.media.findMany({ select: { url: true, mimeType: true } });
  const candidates = media
    .filter((m) => m.url.startsWith("/uploads/"))
    .map((m) => ({ filename: decodeURIComponent(m.url.slice("/uploads/".length)), mimeType: m.mimeType }))
    .filter((c) => !seeds.has(c.filename));

  const existing = new Set(
    (await prisma.uploadedFile.findMany({ select: { filename: true } })).map((r) => r.filename),
  );

  let copied = 0;
  let missing = 0;
  let present = 0;
  for (const c of candidates) {
    if (existing.has(c.filename)) {
      present++;
      console.log(`  present  ${c.filename}`);
      continue;
    }
    const res = await fetch(`${BASE}/uploads/${encodeURIComponent(c.filename)}`);
    if (res.status !== 200) {
      missing++;
      console.log(`  ${res.status}      ${c.filename} (not on ${BASE}; skipped)`);
      continue;
    }
    const data = new Uint8Array(await res.arrayBuffer());
    if (WRITE) {
      await prisma.uploadedFile.create({ data: { filename: c.filename, mimeType: c.mimeType, size: data.length, data } });
    }
    copied++;
    console.log(`  ${WRITE ? "copied" : "would copy"}  ${c.filename} (${data.length} bytes)`);
  }

  console.log(
    `copy-uploads-to-db: ${candidates.length} candidates — ${copied} ${WRITE ? "copied" : "to copy"}, ${present} already present, ${missing} missing upstream${WRITE ? "" : " (dry run; pass --write)"}`,
  );
}

main()
  .catch((err) => {
    console.error("copy-uploads-to-db failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
