/**
 * Replace uploaded PDFs with re-redacted versions, keeping the previous
 * version on the site as a NON-PUBLIC file.
 *
 *   REDACTED_DIR=/path/to/pdfs npx tsx scripts/swap-redacted-uploads.ts           # dry run
 *   REDACTED_DIR=/path/to/pdfs npx tsx scripts/swap-redacted-uploads.ts --write   # apply
 *
 * Every <name>.pdf in REDACTED_DIR must already exist in uploaded_files under
 * the same name. For each one:
 *   1. the current bytes are copied to <name>-pre-redaction-<STAMP>.pdf, and
 *      that name is marked is_public = false in file_settings, so only an admin
 *      can open it (proxy.ts and /uploads/[filename] answer 404 to everyone
 *      else; it is listed in /admin/files);
 *   2. the row under <name> gets the new bytes, so every link on the site keeps
 *      working and now serves the redacted version.
 * The backup is written before the swap and never overwritten, so running the
 * script twice cannot lose the original.
 *
 * Env: DATABASE_URL (the live DB), REDACTED_DIR, STAMP (default: today, YYYYMMDD).
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const WRITE = process.argv.includes("--write");
const DIR = process.env.REDACTED_DIR;
const STAMP = process.env.STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, "");

async function main() {
  if (!DIR) throw new Error("REDACTED_DIR is required");
  const names = readdirSync(DIR).filter((n) => n.endsWith(".pdf")).sort();
  if (names.length === 0) throw new Error(`no PDFs in ${DIR}`);

  for (const name of names) {
    const data = new Uint8Array(readFileSync(path.join(DIR, name)));
    if (String.fromCharCode(...data.slice(0, 5)) !== "%PDF-") throw new Error(`${name}: not a PDF`);

    const current = await prisma.uploadedFile.findUnique({ where: { filename: name } });
    if (!current) throw new Error(`${name}: not in uploaded_files — refusing to create it`);

    const backup = name.replace(/\.pdf$/, `-pre-redaction-${STAMP}.pdf`);
    const hasBackup = await prisma.uploadedFile.findUnique({ where: { filename: backup }, select: { size: true } });
    console.log(`${name}: ${current.size} → ${data.length} bytes; backup ${backup}${hasBackup ? " (exists, kept)" : ""}`);
    if (!WRITE) continue;

    await prisma.$transaction(async (tx) => {
      // Hide first, so the backup is never reachable, even for a moment.
      await tx.fileSetting.upsert({
        where: { filename: backup },
        create: { filename: backup, isPublic: false, note: `גרסה לפני השחרה מחמירה של ${name}` },
        update: { isPublic: false },
      });
      if (!hasBackup) {
        await tx.uploadedFile.create({
          data: { filename: backup, data: current.data, size: current.size, mimeType: current.mimeType },
        });
      }
      await tx.uploadedFile.update({ where: { filename: name }, data: { data, size: data.length } });
    });
  }
  console.log(WRITE ? "done" : "dry run — pass --write to apply");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
