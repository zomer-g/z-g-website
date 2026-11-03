/**
 * Pure helpers for replacing an uploaded PDF with a re-redacted version
 * (src/lib/upload-replace.ts). No DB access, so tests can import them.
 */

export const BACKUP_TAG = "-pre-redaction-";

/** YYYYMMDD, the suffix every backup name carries. */
export const STAMP_RE = /^\d{8}$/;

export function todayStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

/** <name>.pdf → <name>-pre-redaction-<stamp>.pdf */
export function backupNameFor(filename: string, stamp: string): string {
  return filename.replace(/\.pdf$/i, `${BACKUP_TAG}${stamp}.pdf`);
}

/**
 * A bare .pdf name that may be replaced: no path, and not itself a backup,
 * so a backup can never be swapped (and so re-backed-up) in turn.
 */
export function isReplaceableName(filename: string): boolean {
  return (
    /^[^/\\]{1,200}\.pdf$/i.test(filename) &&
    !filename.includes("..") &&
    !filename.includes(BACKUP_TAG)
  );
}

/** Starts with "%PDF-". */
export function isPdf(data: Uint8Array): boolean {
  return (
    data.length > 5 &&
    data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46 && data[4] === 0x2d
  );
}
