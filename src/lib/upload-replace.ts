import { prisma } from "@/lib/prisma";
import { PRIVATE_FILES_TTL_MS } from "@/lib/private-files";
import { backupNameFor } from "@/lib/upload-replace-names";

/**
 * Replace an uploaded PDF with a re-redacted version, keeping the previous
 * bytes on the site as a NON-PUBLIC file. Used by
 * PUT /api/v1/uploads/<name>/replace and scripts/swap-redacted-uploads.ts.
 *
 *   1. <name>-pre-redaction-<stamp>.pdf is marked is_public = false in
 *      file_settings, so only an admin can open it (proxy.ts and
 *      /uploads/[filename] answer 404 to everyone else; /admin/files lists it);
 *   2. the current bytes are copied to that name — never overwriting an
 *      existing backup, so a second run cannot lose the original;
 *   3. the row under <name> gets the new bytes, so every link on the site
 *      keeps working and now serves the redacted version.
 * It never creates a name that is not already in uploaded_files.
 */

export interface ReplacePlan {
  filename: string;
  backup: string;
  oldSize: number;
  newSize: number;
  backupExisted: boolean;
}

/** What replaceUpload() would do, or null if <filename> is not in uploaded_files. */
export async function planReplace(filename: string, newSize: number, stamp: string): Promise<ReplacePlan | null> {
  const current = await prisma.uploadedFile.findUnique({ where: { filename }, select: { size: true } });
  if (!current) return null;
  const backup = backupNameFor(filename, stamp);
  const existing = await prisma.uploadedFile.findUnique({ where: { filename: backup }, select: { size: true } });
  return { filename, backup, oldSize: current.size, newSize, backupExisted: !!existing };
}

export async function replaceUpload(plan: ReplacePlan, data: Uint8Array<ArrayBuffer>): Promise<void> {
  // Hide the backup name in its own commit before the backup exists. Every
  // process (proxy.ts, /uploads) caches the hidden set for
  // PRIVATE_FILES_TTL_MS, so wait that out too: otherwise an instance with a
  // stale copy could serve the new backup as public for a few seconds.
  await prisma.fileSetting.upsert({
    where: { filename: plan.backup },
    create: { filename: plan.backup, isPublic: false, note: `גרסה לפני השחרה מחמירה של ${plan.filename}` },
    update: { isPublic: false },
  });
  if (!plan.backupExisted) await new Promise((r) => setTimeout(r, PRIVATE_FILES_TTL_MS + 1_000));

  await prisma.$transaction(
    async (tx) => {
      const current = await tx.uploadedFile.findUnique({ where: { filename: plan.filename } });
      if (!current) throw new Error(`${plan.filename}: no longer in uploaded_files`);
      const hasBackup = await tx.uploadedFile.findUnique({ where: { filename: plan.backup }, select: { size: true } });
      if (!hasBackup) {
        await tx.uploadedFile.create({
          data: { filename: plan.backup, data: current.data, size: current.size, mimeType: current.mimeType },
        });
      }
      await tx.uploadedFile.update({
        where: { filename: plan.filename },
        data: { data, size: data.length, mimeType: "application/pdf" },
      });
    },
    { timeout: 30_000 },
  );
}
