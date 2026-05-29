// One-off smoke test for the FOI Guide crawler.
// Run: npx tsx scripts/test-foi-crawler.ts

import {
  fetchIndex,
  fetchHtml,
  parseChapter,
} from "../src/lib/foi-guide-crawler";
import { chunkFoiChapter } from "../src/lib/foi-guide-chunker";

async function main() {
  console.log("→ Fetching index from foiguide.org.il …");
  const index = await fetchIndex();
  console.log(`  index returned ${index.length} chapters`);
  for (const ref of index) {
    console.log(`  [${ref.order.toString().padStart(3)}] ${ref.title}`);
    console.log(`        ${ref.url}`);
  }

  // Pick chapter 12 (סעיף 14 — has the case-law section we verified).
  const target =
    index.find((r) => r.title.startsWith("12 ")) ??
    index.find((r) => /סעיף 14/.test(r.title)) ??
    index[Math.min(11, index.length - 1)];

  console.log(`\n→ Fetching chapter ${target.order}: ${target.title}`);
  const html = await fetchHtml(target.url);
  console.log(`  HTML length: ${html.length} chars`);

  const parsed = parseChapter(html, target.url);
  console.log(`  title parsed: ${parsed.title}`);
  console.log(`  body chars: ${parsed.textChars}`);
  console.log(`  footnotes parsed: ${parsed.footnotes.length}`);
  const caseLawFns = parsed.footnotes.filter((f) => f.isCaseLaw);
  console.log(`  case-law footnotes flagged: ${caseLawFns.length}`);
  if (caseLawFns.length > 0) {
    console.log(`  first 3 case-law footnotes:`);
    for (const f of caseLawFns.slice(0, 3)) {
      console.log(`    [${f.footnoteId}] ${f.text.slice(0, 100)}…`);
      for (const l of f.links.slice(0, 2)) console.log(`        link: ${l}`);
    }
  }

  const chunks = chunkFoiChapter({
    title: target.title,
    slug: target.slug,
    url: target.url,
    parsed,
  });
  console.log(`  chunks produced: ${chunks.length}`);
  const bySection = chunks.reduce<Record<string, number>>((acc, c) => {
    acc[c.section] = (acc[c.section] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  chunks by section:`, bySection);
  if (chunks.length > 0) {
    console.log(`\n  first chunk preview:`);
    console.log(`  ${chunks[0].text.slice(0, 200)}…`);
  }

  if (index.length < 15) {
    throw new Error(
      `Expected at least 15 chapters in the index; got ${index.length}`,
    );
  }
  if (caseLawFns.length === 0) {
    throw new Error(
      "Expected case-law footnotes in chapter 12 but found none — check the parser",
    );
  }
  console.log("\n✓ Crawler smoke test passed.");
}

main().catch((err) => {
  console.error("✗ Crawler smoke test failed:", err);
  process.exit(1);
});
