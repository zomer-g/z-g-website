// Proofread every Hebrew string the public site renders, using gpt-4o-mini
// to flag typos, agreement errors, and awkward phrasing. Output: a Markdown
// report grouped by source, plus a JSON sidecar for tooling.
//
// Run: npm run proofread
// Cost: a few cents on a corpus our size (~$0.005-0.05).
//
// Why a script and not a route? Proofreading is a slow, batched, one-shot
// task — wrong shape for a request handler, perfect shape for a tsx script.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CONTENT_DEFAULTS } from "../src/lib/content-defaults";
import "dotenv/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

// Cap each batch at a comfortable token budget. ~30 strings × ~50 tokens each
// is well under the model's context, and small enough that an error in one
// batch doesn't sink the whole run.
const BATCH_SIZE = 30;
const MIN_TEXT_LEN = 4;
const MAX_TEXT_LEN = 2000; // skip giant article bodies; review those by hand

interface ContentItem {
  source: string; // e.g. "defaults:home.hero.title" or "db:Page[home]:hero.title"
  text: string;
}

interface ProofreadIssue {
  source: string;
  original: string;
  suggestion: string;
  reason: string;
}

// ── Walking helpers ───────────────────────────────────────────────────────

function isHebrewish(s: string): boolean {
  // Has at least one Hebrew letter and isn't dominated by non-text noise.
  if (!/[֐-׿]/.test(s)) return false;
  const trimmed = s.trim();
  if (trimmed.length < MIN_TEXT_LEN || trimmed.length > MAX_TEXT_LEN) return false;
  // Skip URLs / paths / hex colors / icon identifiers.
  if (/^https?:\/\//.test(trimmed)) return false;
  if (/^\/[a-zA-Z0-9/-]+$/.test(trimmed)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return false;
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return false;
  return true;
}

function walkValue(value: unknown, pathPrefix: string, out: ContentItem[]) {
  if (value == null) return;
  if (typeof value === "string") {
    if (isHebrewish(value)) out.push({ source: pathPrefix, text: value.trim() });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkValue(v, `${pathPrefix}[${i}]`, out));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkValue(v, pathPrefix ? `${pathPrefix}.${k}` : k, out);
    }
  }
}

// Tiptap content lives as JSON. Pull just the text leaves so we can
// proofread each paragraph/heading independently.
function walkTiptap(node: unknown, pathPrefix: string, out: ContentItem[]) {
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;
  if (typeof n.text === "string" && isHebrewish(n.text)) {
    out.push({ source: pathPrefix, text: (n.text as string).trim() });
  }
  if (Array.isArray(n.content)) {
    n.content.forEach((child, i) => walkTiptap(child, `${pathPrefix}[${i}]`, out));
  }
}

// ── Sources ───────────────────────────────────────────────────────────────

async function collectFromDefaults(): Promise<ContentItem[]> {
  const out: ContentItem[] = [];
  for (const [slug, defaults] of Object.entries(CONTENT_DEFAULTS)) {
    walkValue(defaults, `defaults:${slug}`, out);
  }
  return out;
}

async function collectFromPages(): Promise<ContentItem[]> {
  const out: ContentItem[] = [];
  const pages = await prisma.page.findMany({
    select: { slug: true, content: true, draftContent: true, title: true, seoTitle: true, seoDesc: true },
  });
  for (const p of pages) {
    if (p.title) walkValue(p.title, `db:Page[${p.slug}]:title`, out);
    if (p.seoTitle) walkValue(p.seoTitle, `db:Page[${p.slug}]:seoTitle`, out);
    if (p.seoDesc) walkValue(p.seoDesc, `db:Page[${p.slug}]:seoDesc`, out);
    if (p.content) walkValue(p.content, `db:Page[${p.slug}]:content`, out);
    if (p.draftContent) walkValue(p.draftContent, `db:Page[${p.slug}]:draftContent`, out);
  }
  return out;
}

async function collectFromPosts(): Promise<ContentItem[]> {
  const out: ContentItem[] = [];
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, title: true, excerpt: true, content: true, seoTitle: true, seoDesc: true },
  });
  for (const p of posts) {
    if (p.title) out.push({ source: `db:Post[${p.slug}]:title`, text: p.title });
    if (p.excerpt) out.push({ source: `db:Post[${p.slug}]:excerpt`, text: p.excerpt });
    if (p.seoTitle) out.push({ source: `db:Post[${p.slug}]:seoTitle`, text: p.seoTitle });
    if (p.seoDesc) out.push({ source: `db:Post[${p.slug}]:seoDesc`, text: p.seoDesc });
    if (p.content) walkTiptap(p.content, `db:Post[${p.slug}]:content`, out);
  }
  return out.filter((i) => isHebrewish(i.text));
}

async function collectFromServices(): Promise<ContentItem[]> {
  const out: ContentItem[] = [];
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: { slug: true, title: true, description: true, content: true, seoTitle: true, seoDesc: true },
  });
  for (const s of services) {
    if (s.title) out.push({ source: `db:Service[${s.slug}]:title`, text: s.title });
    if (s.description) out.push({ source: `db:Service[${s.slug}]:description`, text: s.description });
    if (s.seoTitle) out.push({ source: `db:Service[${s.slug}]:seoTitle`, text: s.seoTitle });
    if (s.seoDesc) out.push({ source: `db:Service[${s.slug}]:seoDesc`, text: s.seoDesc });
    if (s.content) walkValue(s.content, `db:Service[${s.slug}]:content`, out);
  }
  return out.filter((i) => isHebrewish(i.text));
}

async function collectFromMediaAppearances(): Promise<ContentItem[]> {
  const out: ContentItem[] = [];
  const items = await prisma.mediaAppearance.findMany({
    where: { isActive: true },
    select: { id: true, title: true, description: true, source: true },
  });
  for (const m of items) {
    if (m.title) out.push({ source: `db:MediaAppearance[${m.id}]:title`, text: m.title });
    if (m.description) out.push({ source: `db:MediaAppearance[${m.id}]:description`, text: m.description });
    if (m.source) out.push({ source: `db:MediaAppearance[${m.id}]:source`, text: m.source });
  }
  return out.filter((i) => isHebrewish(i.text));
}

// ── Deduplication ──────────────────────────────────────────────────────────

function dedupe(items: ContentItem[]): ContentItem[] {
  // Many strings appear multiple times (defaults vs DB, Hebrew constants).
  // Keep the first-seen source and skip the duplicates so we only proofread
  // each unique string once.
  const seen = new Map<string, ContentItem>();
  for (const it of items) {
    if (!seen.has(it.text)) seen.set(it.text, it);
  }
  return Array.from(seen.values());
}

// ── OpenAI ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `אתה מגיה מוסמך לעברית. תפקידך לאתר טעויות ודאיות בלבד:
- שגיאות כתיב (אותיות שגויות, אות חסרה/מיותרת)
- שגיאות הסכמה דקדוקית בולטות (זכר/נקבה, מספר)
- שימוש שגוי במילים (שגיאה ולא בחירת סגנון)
- ניסוח מעוות שאינו ניתן להבנה

לא לסמן: בחירות סגנון, שימוש בכתיב מלא/חסר, ביטויים פורמליים, מונחים מקצועיים, או טעויות לא ודאיות. במקרה של ספק — דלג.

קלט: רשימת מחרוזות ממוספרות. פלט: JSON תקין בלבד בתבנית:
{"issues": [{"index": 1, "original": "...", "suggestion": "...", "reason": "..."}]}

אם אין טעויות במחרוזת מסוימת — אל תכלול אותה. אם אין טעויות בכלל — החזר {"issues": []}.`;

async function proofreadBatch(items: ContentItem[]): Promise<ProofreadIssue[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const numbered = items.map((it, i) => `${i + 1}. ${it.text}`).join("\n");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: numbered },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = json.choices[0]?.message?.content ?? "{}";

  let parsed: { issues?: { index: number; original: string; suggestion: string; reason: string }[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    console.warn("    ⚠ failed to parse model output, skipping batch");
    return [];
  }

  return (parsed.issues ?? [])
    .filter((iss) => Number.isInteger(iss.index) && iss.index >= 1 && iss.index <= items.length)
    .map((iss) => ({
      source: items[iss.index - 1].source,
      original: iss.original,
      suggestion: iss.suggestion,
      reason: iss.reason,
    }));
}

// ── Report ─────────────────────────────────────────────────────────────────

function buildMarkdown(items: ContentItem[], issues: ProofreadIssue[]): string {
  const lines: string[] = [];
  lines.push("# דוח הגהה");
  lines.push("");
  lines.push(`- מחרוזות שנבדקו: **${items.length}**`);
  lines.push(`- בעיות שזוהו: **${issues.length}**`);
  lines.push(`- מודל: ${MODEL}`);
  lines.push(`- נוצר: ${new Date().toLocaleString("he-IL")}`);
  lines.push("");
  if (issues.length === 0) {
    lines.push("לא זוהו טעויות. ");
    return lines.join("\n");
  }

  // Group by top-level source area for easier scanning.
  const groups = new Map<string, ProofreadIssue[]>();
  for (const iss of issues) {
    const prefix = iss.source.split(":")[0] + ":" + (iss.source.split(":")[1] ?? "").split(".")[0];
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

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set in the environment.");
    process.exit(1);
  }

  console.log("Collecting content...");
  const collected = [
    ...(await collectFromDefaults()),
    ...(await collectFromPages()),
    ...(await collectFromPosts()),
    ...(await collectFromServices()),
    ...(await collectFromMediaAppearances()),
  ];
  console.log(`  raw items: ${collected.length}`);

  const unique = dedupe(collected);
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
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(unique.length / BATCH_SIZE);
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
