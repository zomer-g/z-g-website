import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Incremental sync of pah.org.il's live data into z-g.co.il's tables.
 *
 * Unlike seed-pach-hamishpat.ts (which loads the static CSV snapshot at
 * scripts/seed/pach-hamishpat/), this script hits the live public API
 * of pah.org.il and inserts only items whose `created_date` doesn't
 * already exist in the local tables. Safe to re-run.
 *
 *   npx tsx scripts/sync-pach-hamishpat.ts
 *
 * Pass UPSTREAM=https://other-host.example to override the source.
 */

const UPSTREAM = process.env.UPSTREAM || "https://pah.org.il";

interface UpstreamReport {
  id: number;
  status: string;
  description: string | null;
  reporter_type: string;
  created_date: string;
  expires_at: string | null;
  is_hidden: boolean;
  is_scheduled: boolean;
  scheduled_from: string | null;
  scheduled_until: string | null;
}

interface UpstreamComment {
  id: number;
  content: string;
  author_name: string;
  is_admin: boolean;
  is_hidden: boolean;
  created_date: string;
}

interface UpstreamMessage {
  id: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  order_index: number;
  is_archived: boolean;
  created_date: string;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Upstream timestamps sometimes lack a Z suffix — treat them as UTC so
  // the same wall clock comes through unchanged.
  const d = new Date(s.endsWith("Z") || /[\-+]\d\d:?\d\d$/.test(s) ? s : s + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Stable key for dedup. We can't use upstream `id` because it's not
 *  preserved in our autoincrement column, so we use created_date which is
 *  precise enough (ISO-8601 ms) to be effectively unique. */
function keyOf(d: Date): string {
  return d.toISOString();
}

async function fetchUpstream<T>(path: string): Promise<T[]> {
  const url = `${UPSTREAM}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Upstream ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T[];
}

async function syncReports() {
  const upstream = await fetchUpstream<UpstreamReport>(
    "/api/status-reports?limit=2000",
  );
  const localDates = await prisma.pachReport.findMany({
    select: { createdDate: true },
  });
  const have = new Set(localDates.map((r) => keyOf(r.createdDate)));

  let inserted = 0;
  for (const r of upstream) {
    const created = parseDate(r.created_date);
    if (!created) continue;
    if (have.has(keyOf(created))) continue;
    const status =
      r.status === "red" || r.status === "orange" || r.status === "green"
        ? r.status
        : "green";
    await prisma.pachReport.create({
      data: {
        status,
        description: r.description ?? null,
        reporterType: r.reporter_type || "user",
        createdDate: created,
        expiresAt: parseDate(r.expires_at),
        isHidden: !!r.is_hidden,
        isScheduled: !!r.is_scheduled,
        scheduledFrom: parseDate(r.scheduled_from),
        scheduledUntil: parseDate(r.scheduled_until),
      },
    });
    inserted++;
  }
  console.log(
    `Reports: ${upstream.length} upstream, ${have.size} already local, ${inserted} inserted.`,
  );
}

async function syncComments() {
  const upstream = await fetchUpstream<UpstreamComment>(
    "/api/comments?limit=2000",
  );
  const localDates = await prisma.pachComment.findMany({
    select: { createdDate: true },
  });
  const have = new Set(localDates.map((c) => keyOf(c.createdDate)));

  let inserted = 0;
  for (const c of upstream) {
    if (!c.content) continue;
    const created = parseDate(c.created_date);
    if (!created) continue;
    if (have.has(keyOf(created))) continue;
    await prisma.pachComment.create({
      data: {
        content: c.content,
        authorName: c.author_name || "אנונימי",
        isAdmin: !!c.is_admin,
        isHidden: !!c.is_hidden,
        createdDate: created,
      },
    });
    inserted++;
  }
  console.log(
    `Comments: ${upstream.length} upstream, ${have.size} already local, ${inserted} inserted.`,
  );
}

async function syncMessages() {
  const upstream = await fetchUpstream<UpstreamMessage>(
    "/api/system-messages?limit=2000",
  );
  const localDates = await prisma.pachSystemMessage.findMany({
    select: { createdDate: true },
  });
  const have = new Set(localDates.map((m) => keyOf(m.createdDate)));

  let inserted = 0;
  for (const m of upstream) {
    const created = parseDate(m.created_date);
    if (!created) continue;
    if (have.has(keyOf(created))) continue;
    await prisma.pachSystemMessage.create({
      data: {
        title: m.title ?? null,
        content: m.content ?? null,
        imageUrl: m.image_url ?? null,
        orderIndex: Number.isFinite(Number(m.order_index)) ? Number(m.order_index) : 0,
        isArchived: !!m.is_archived,
        createdDate: created,
      },
    });
    inserted++;
  }
  console.log(
    `Messages: ${upstream.length} upstream, ${have.size} already local, ${inserted} inserted.`,
  );
}

async function main() {
  console.log(`Syncing from ${UPSTREAM}...`);
  await syncReports();
  await syncComments();
  await syncMessages();
  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
