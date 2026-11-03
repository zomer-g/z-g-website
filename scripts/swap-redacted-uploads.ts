/**
 * Replace uploaded PDFs with re-redacted versions, keeping the previous
 * version on the site as a NON-PUBLIC file.
 *
 *   REDACTED_DIR=/path/to/pdfs npx tsx scripts/swap-redacted-uploads.ts           # dry run
 *   REDACTED_DIR=/path/to/pdfs npx tsx scripts/swap-redacted-uploads.ts --write   # apply
 *
 * Every <name>.pdf in REDACTED_DIR must already exist in uploaded_files under
 * the same name. What happens to each one is src/lib/upload-replace.ts — the
 * same code behind PUT /api/v1/uploads/<name>/replace, which does this over
 * HTTP with an API key instead of DB access.
 *
 * Env: DATABASE_URL (the live DB), REDACTED_DIR, STAMP (default: today, YYYYMMDD).
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { planReplace, replaceUpload } from "../src/lib/upload-replace";
import { isPdf, isReplaceableName, STAMP_RE, todayStamp } from "../src/lib/upload-replace-names";

const WRITE = process.argv.includes("--write");
const DIR = process.env.REDACTED_DIR;
const STAMP = process.env.STAMP || todayStamp();

async function main() {
  if (!DIR) throw new Error("REDACTED_DIR is required");
  if (!STAMP_RE.test(STAMP)) throw new Error("STAMP must be YYYYMMDD");
  const names = readdirSync(DIR).filter((n) => n.endsWith(".pdf")).sort();
  if (names.length === 0) throw new Error(`no PDFs in ${DIR}`);

  for (const name of names) {
    if (!isReplaceableName(name)) throw new Error(`${name}: not a replaceable name`);
    const data = new Uint8Array(readFileSync(path.join(DIR, name)));
    if (!isPdf(data)) throw new Error(`${name}: not a PDF`);

    const plan = await planReplace(name, data.length, STAMP);
    if (!plan) throw new Error(`${name}: not in uploaded_files — refusing to create it`);
    console.log(`${name}: ${plan.oldSize} → ${plan.newSize} bytes; backup ${plan.backup}${plan.backupExisted ? " (exists, kept)" : ""}`);
    if (WRITE) await replaceUpload(plan, data);
  }
  console.log(WRITE ? "done" : "dry run — pass --write to apply");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
