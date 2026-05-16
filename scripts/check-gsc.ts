/**
 * Smoke test for GSC service account access.
 * Usage:
 *   npx tsx scripts/check-gsc.ts <path-to-sa-json> <site-url-or-sc-domain>
 *
 * Example:
 *   npx tsx scripts/check-gsc.ts C:\Users\zomer\Downloads\z-g-website-4a7f817754dd.json sc-domain:z-g.co.il
 *   npx tsx scripts/check-gsc.ts C:\Users\zomer\Downloads\z-g-website-4a7f817754dd.json https://z-g.co.il/
 */

import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";

async function main() {
  const [jsonPath, siteUrl] = process.argv.slice(2);
  if (!jsonPath || !siteUrl) {
    console.error("Usage: npx tsx scripts/check-gsc.ts <path-to-sa-json> <site-url-or-sc-domain>");
    process.exit(1);
  }

  const raw = readFileSync(jsonPath, "utf8");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  console.log(`SA email: ${sa.client_email}`);
  console.log(`Site:     ${siteUrl}`);

  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  // 1) List the sites the SA can see (sanity check for permissions).
  console.log("\n— Sites visible to this SA —");
  try {
    const sites = await client.request<{ siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }>({
      url: "https://searchconsole.googleapis.com/webmasters/v3/sites",
      method: "GET",
    });
    const entries = sites.data.siteEntry ?? [];
    if (entries.length === 0) {
      console.log("(none) — the SA isn't a user on any property yet. Add it in Search Console → Settings → Users.");
    } else {
      for (const s of entries) console.log(`  ${s.permissionLevel}  ${s.siteUrl}`);
    }
  } catch (err) {
    console.error("Failed to list sites:", err instanceof Error ? err.message : err);
  }

  // 2) Try a real query against the requested site.
  console.log(`\n— Top 5 queries for ${siteUrl}, last 28 days —`);
  const today = new Date();
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 28);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await client.request<{
      rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
    }>({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: "POST",
      data: {
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ["query"],
        rowLimit: 5,
      },
    });
    const rows = res.data.rows ?? [];
    if (rows.length === 0) {
      console.log("(no rows) — query succeeded but no data in this window.");
    } else {
      for (const r of rows) {
        console.log(
          `  pos=${r.position.toFixed(1).padStart(5)}  imp=${String(r.impressions).padStart(6)}  clk=${String(r.clicks).padStart(4)}  ${r.keys[0]}`,
        );
      }
    }
  } catch (err) {
    console.error("Query failed:", err instanceof Error ? err.message : err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
