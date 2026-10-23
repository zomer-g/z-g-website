import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. DB side: how many docs are embedded?
  const embedded = await prisma.guidelineEmbedding.findMany({
    select: { id: true, chunkCount: true, updatedAt: true, model: true },
  });
  const embeddedIds = new Set(embedded.map((e) => e.id));
  console.log(`Embeddings in DB: ${embedded.length} docs`);
  console.log(`Chunks total: ${embedded.reduce((a, b) => a + b.chunkCount, 0)}`);

  const newest = embedded
    .map((e) => e.updatedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const oldest = embedded
    .map((e) => e.updatedAt)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  console.log(`Newest updatedAt: ${newest?.toISOString()}`);
  console.log(`Oldest updatedAt: ${oldest?.toISOString()}`);

  // 2. Upstream side: pull the full list and bucket by source_label.
  const baseUrl = "https://z-g-website.onrender.com/api/guidelines/documents";
  const allUpstream: Array<{ id: number; source_label: string; document_title: string }> = [];
  let skip = 0;
  while (true) {
    const r = await fetch(`${baseUrl}?limit=100&skip=${skip}`);
    if (!r.ok) {
      console.error(`upstream fetch failed: ${r.status}`);
      break;
    }
    const j = (await r.json()) as { items: Array<{ id: number; source_label: string; document_title: string }>; total: number };
    allUpstream.push(...j.items);
    if (allUpstream.length >= j.total) break;
    skip += 100;
  }
  console.log(`\nUpstream docs: ${allUpstream.length}`);

  // 3. Per-source coverage.
  const bySource = new Map<string, { total: number; embedded: number; missing: number[] }>();
  for (const it of allUpstream) {
    const s = it.source_label || "(empty)";
    if (!bySource.has(s)) bySource.set(s, { total: 0, embedded: 0, missing: [] });
    const bucket = bySource.get(s)!;
    bucket.total += 1;
    if (embeddedIds.has(it.id)) bucket.embedded += 1;
    else bucket.missing.push(it.id);
  }

  console.log(`\nPer-source coverage:`);
  console.log("source | total | embedded | missing");
  console.log("-".repeat(80));
  for (const [src, b] of [...bySource.entries()].sort((a, b) => b[1].total - a[1].total)) {
    const pct = b.total > 0 ? ((b.embedded / b.total) * 100).toFixed(1) : "0.0";
    console.log(`${src} | ${b.total} | ${b.embedded} (${pct}%) | ${b.missing.length}`);
  }

  // 4. Spotlight: פרקליט המדינה
  const pmd = bySource.get("פרקליט המדינה");
  if (pmd) {
    console.log(`\n=== פרקליט המדינה: ${pmd.embedded}/${pmd.total} embedded ===`);
    if (pmd.missing.length > 0) {
      console.log(`Missing ids (first 20): ${pmd.missing.slice(0, 20).join(", ")}`);
    } else {
      console.log("All פרקליט המדינה docs embedded ✓");
    }
  }

  // 5. Stale embeddings: docs in DB whose id no longer exists upstream.
  const upstreamIds = new Set(allUpstream.map((it) => it.id));
  const stale = embedded.filter((e) => !upstreamIds.has(e.id));
  if (stale.length > 0) {
    console.log(`\nStale embeddings (in DB but not upstream): ${stale.length}`);
    console.log(`First 10 stale ids: ${stale.slice(0, 10).map((s) => s.id).join(", ")}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
