import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * One-time import of pah.org.il's existing CSV exports (StatusReport,
 * ReportComment, SystemMessage) into the z-g.co.il Postgres DB.
 *
 * Idempotent — if any rows already exist in any of the three tables the
 * import bails out. Run with:
 *
 *   npx tsx scripts/seed-pach-hamishpat.ts
 *
 * Pass FORCE=1 to import even if rows already exist (rows will be added,
 * not replaced — duplicates may result).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.join(__dirname, "..", "seed", "pach-hamishpat");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      current.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // handle CRLF + LF
      if (field.length || current.length) {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      }
      if (ch === "\r" && text[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length || current.length) {
    current.push(field);
    rows.push(current);
  }
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    return obj;
  });
}

function boolish(v: string | undefined): boolean {
  if (!v) return false;
  return v.toLowerCase() === "true" || v === "1";
}

function isoOrNull(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v.endsWith("Z") || v.includes("+") ? v : v + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const force = process.env.FORCE === "1";
  const [reportCount, commentCount, messageCount] = await Promise.all([
    prisma.pachReport.count(),
    prisma.pachComment.count(),
    prisma.pachSystemMessage.count(),
  ]);

  if ((reportCount || commentCount || messageCount) && !force) {
    console.log(
      `Skipping — DB already has rows (reports=${reportCount}, comments=${commentCount}, messages=${messageCount}).`,
    );
    console.log("Pass FORCE=1 to import anyway.");
    await prisma.$disconnect();
    return;
  }

  /* Status reports */
  const reportsCsv = fs.readFileSync(
    path.join(seedDir, "StatusReport_export.csv"),
    "utf8",
  );
  const reports = parseCsv(reportsCsv);
  for (const r of reports) {
    const status =
      r.status === "red" || r.status === "orange" || r.status === "green"
        ? r.status
        : "green";
    await prisma.pachReport.create({
      data: {
        status,
        description: r.description || null,
        reporterType: r.reporter_type || "user",
        createdDate: isoOrNull(r.created_date) ?? new Date(),
        expiresAt: isoOrNull(r.expires_at),
        isHidden: boolish(r.is_hidden),
        isScheduled: boolish(r.is_scheduled),
        scheduledFrom: isoOrNull(r.scheduled_from),
        scheduledUntil: isoOrNull(r.scheduled_until),
      },
    });
  }
  console.log(`Imported ${reports.length} status reports.`);

  /* Comments */
  const commentsCsv = fs.readFileSync(
    path.join(seedDir, "ReportComment_export.csv"),
    "utf8",
  );
  const comments = parseCsv(commentsCsv);
  for (const c of comments) {
    if (!c.content) continue;
    await prisma.pachComment.create({
      data: {
        content: c.content,
        authorName: c.author_name || "אנונימי",
        isAdmin: boolish(c.is_admin),
        isHidden: boolish(c.is_hidden),
        createdDate: isoOrNull(c.created_date) ?? new Date(),
      },
    });
  }
  console.log(`Imported ${comments.length} comments.`);

  /* System messages */
  const messagesCsv = fs.readFileSync(
    path.join(seedDir, "SystemMessage_export.csv"),
    "utf8",
  );
  const messages = parseCsv(messagesCsv);
  for (const m of messages) {
    await prisma.pachSystemMessage.create({
      data: {
        title: m.title || null,
        content: m.content || null,
        imageUrl: m.image_url || null,
        orderIndex: Number(m.order_index) || 0,
        isArchived: boolish(m.is_archived),
        createdDate: isoOrNull(m.created_date) ?? new Date(),
      },
    });
  }
  console.log(`Imported ${messages.length} system messages.`);

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
