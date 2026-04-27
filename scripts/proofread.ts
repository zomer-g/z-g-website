// CLI proofreading runner. Same brain as /admin/proofread (both share
// src/lib/proofread/*). Useful when you'd rather get a Markdown report on
// disk than click through a web UI.
//
// Run: npm run proofread          (writes proofread-report.{md,json})
//      npm run proofread -- --dry-run  (no LLM calls, just lists items)

import "dotenv/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { collectAllContent, type ContentItem } from "../src/lib/proofread/collect";
import {
  proofreadBatch,
  PROOFREAD_BATCH_SIZE,
  PROOFREAD_MODEL,
  type ProofreadIssue,
} from "../src/lib/proofread/check";
import { prisma } from "../src/lib/prisma";

function buildMarkdown(items: ContentItem[], issues: ProofreadIssue[]): string {
  const lines: string[] = [];
  lines.push("# דוח הגהה");
  lines.push("");
  lines.push(`- מחרוזות שנבדקו: **${items.length}**`);
  lines.push(`- בעיות שזוהו: **${issues.length}**`);
  lines.push(`- מודל: ${PROOFREAD_MODEL}`);
  lines.push(`- נוצר: ${new Date().toLocaleString("he-IL")}`);
  lines.push("");
  if (issues.length === 0) {
    lines.push("לא זוהו טעויות.");
    return lines.join("\n");
  }

  const groups = new Map<string, ProofreadIssue[]>();
  for (const iss of issues) {
    const prefix =
      iss.source.split(":")[0] +
      ":" +
      (iss.source.split(":")[1] ?? "").split(".")[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(iss);
  }

  for (const [group, list] of Array.from(groups.entries()).sort()) {
    lines.push(`## ${group}`);
    lines.push("");
    for (const iss of list) {
      lines.push(`### \`${iss.source}\``);
      lines.push("");
      lines.push(`**מקורי:** ${iss.original}`);
      lines.push("");
      lines.push(`**הצעה:** ${iss.suggestion}`);
      lines.push("");
      lines.push(`**סיבה:** ${iss.reason}`);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }
  return lines.join("\n");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set in the environment.");
    process.exit(1);
  }

  console.log("Collecting content...");
  const unique = await collectAllContent();
  console.log(`  unique strings to proofread: ${unique.length}`);

  if (dryRun) {
    console.log("\n--dry-run: skipping LLM calls. Sample of collected items:");
    for (const it of unique.slice(0, 15)) {
      console.log(`  [${it.source}] ${it.text.slice(0, 80)}`);
    }
    if (unique.length > 15) console.log(`  ...and ${unique.length - 15} more`);
    return;
  }

  const issues: ProofreadIssue[] = [];
  for (let i = 0; i < unique.length; i += PROOFREAD_BATCH_SIZE) {
    const batch = unique.slice(i, i + PROOFREAD_BATCH_SIZE);
    const batchNum = Math.floor(i / PROOFREAD_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(unique.length / PROOFREAD_BATCH_SIZE);
    process.stdout.write(`  batch ${batchNum}/${totalBatches}... `);
    try {
      const found = await proofreadBatch(batch);
      issues.push(...found);
      console.log(`${found.length} issue(s)`);
    } catch (err) {
      console.warn(`failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nTotal issues found: ${issues.length}`);

  const report = buildMarkdown(unique, issues);
  const reportPath = path.join(process.cwd(), "proofread-report.md");
  await fs.writeFile(reportPath, report, "utf8");
  await fs.writeFile(
    path.join(process.cwd(), "proofread-report.json"),
    JSON.stringify({ items: unique.length, issues }, null, 2),
    "utf8",
  );
  console.log(`Report: ${reportPath}`);
}

main()
  .catch((e) => {
    console.error("Proofread failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
