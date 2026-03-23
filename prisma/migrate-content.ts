/**
 * One-time migration script: imports content from CSV exports of the previous site
 * into the current PostgreSQL database.
 *
 * Usage: npx tsx prisma/migrate-content.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/* ─── CSV Parser (handles quoted fields with commas/newlines) ─── */

function parseCSV(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1 || current[0] !== "") {
          rows.push(current);
        }
        current = [];
        if (ch === "\r") i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }
  // last field/row
  current.push(field);
  if (current.length > 1 || current[0] !== "") {
    rows.push(current);
  }

  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (row[i] ?? "").trim();
    });
    return obj;
  });
}

/* ─── HTML → TipTap JSON Converter ─── */

interface TTNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TTNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

function htmlToTipTap(html: string): TTNode {
  const doc: TTNode = { type: "doc", content: [] };
  if (!html || html.trim() === "") return doc;

  // Simple HTML parser using regex-based tokenization
  const tokens = tokenizeHTML(html);
  const root: TTNode = { type: "root", content: [] };
  const stack: TTNode[] = [root];

  for (const token of tokens) {
    const parent = stack[stack.length - 1];

    if (token.type === "open") {
      const tag = token.tag!.toLowerCase();
      const node = createNodeForTag(tag, token.attrs);
      if (node) {
        if (!parent.content) parent.content = [];
        parent.content.push(node);
        stack.push(node);
      }
    } else if (token.type === "close") {
      const tag = token.tag!.toLowerCase();
      // Pop stack back to matching open tag
      if (stack.length > 1 && isBlockTag(tag)) {
        // Find and pop matching tag
        for (let i = stack.length - 1; i > 0; i--) {
          const n = stack[i];
          if (nodeMatchesTag(n, tag)) {
            stack.length = i;
            break;
          }
        }
      } else if (stack.length > 1 && isInlineTag(tag)) {
        // For inline tags, just pop if top matches
        if (stack.length > 1) {
          const top = stack[stack.length - 1];
          if (nodeMatchesTag(top, tag)) {
            stack.pop();
          }
        }
      }
    } else if (token.type === "text") {
      const text = token.text!;
      if (text.trim() === "") continue;

      // Collect marks from inline ancestors
      const marks = collectMarks(stack);
      const textNode: TTNode = { type: "text", text };
      if (marks.length > 0) textNode.marks = marks;

      // Find nearest block-level parent to add text to
      const blockParent = findNearestBlock(stack);
      if (blockParent.type === "root" || isBlockNode(blockParent)) {
        // Need to wrap in paragraph if parent is block-level but not paragraph
        if (
          blockParent.type === "root" ||
          blockParent.type === "doc" ||
          blockParent.type === "listItem" ||
          blockParent.type === "blockquote"
        ) {
          // Check if last child is a paragraph we can append to
          const lastChild =
            blockParent.content?.[blockParent.content.length - 1];
          if (lastChild?.type === "paragraph") {
            if (!lastChild.content) lastChild.content = [];
            lastChild.content.push(textNode);
          } else {
            if (!blockParent.content) blockParent.content = [];
            blockParent.content.push({
              type: "paragraph",
              content: [textNode],
            });
          }
        } else {
          // Paragraph, heading — add text directly
          if (!blockParent.content) blockParent.content = [];
          blockParent.content.push(textNode);
        }
      }
    } else if (token.type === "selfclose") {
      const tag = token.tag!.toLowerCase();
      if (tag === "br") {
        // Add hard break
        const blockParent = findNearestBlock(stack);
        if (blockParent.type === "paragraph" || blockParent.type === "heading") {
          if (!blockParent.content) blockParent.content = [];
          blockParent.content.push({ type: "hardBreak" });
        }
      }
    }
  }

  // Flatten root → doc
  doc.content = root.content?.filter(isBlockNode) ?? [];

  // Clean up: remove empty paragraphs
  doc.content = doc.content.filter((node) => {
    if (node.type === "paragraph") {
      if (!node.content || node.content.length === 0) return false;
      // Remove paragraphs that only have hardBreaks
      if (node.content.every((c) => c.type === "hardBreak")) return false;
    }
    return true;
  });

  return doc;
}

interface HTMLToken {
  type: "open" | "close" | "selfclose" | "text";
  tag?: string;
  attrs?: Record<string, string>;
  text?: string;
}

function tokenizeHTML(html: string): HTMLToken[] {
  const tokens: HTMLToken[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)\/?\s*>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    if (match[3] !== undefined) {
      // Text node
      const text = decodeHTMLEntities(match[3]);
      if (text) tokens.push({ type: "text", text });
    } else {
      const fullMatch = match[0];
      const tagName = match[1];
      const attrsStr = match[2] || "";

      if (fullMatch.startsWith("</")) {
        tokens.push({ type: "close", tag: tagName });
      } else if (
        fullMatch.endsWith("/>") ||
        ["br", "hr", "img"].includes(tagName.toLowerCase())
      ) {
        const attrs = parseAttrs(attrsStr);
        tokens.push({ type: "selfclose", tag: tagName, attrs });
      } else {
        const attrs = parseAttrs(attrsStr);
        tokens.push({ type: "open", tag: tagName, attrs });
      }
    }
  }

  return tokens;
}

function parseAttrs(str: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function createNodeForTag(
  tag: string,
  attrs?: Record<string, string>,
): TTNode | null {
  switch (tag) {
    case "h1":
      return { type: "heading", attrs: { level: 1 }, content: [] };
    case "h2":
      return { type: "heading", attrs: { level: 2 }, content: [] };
    case "h3":
      return { type: "heading", attrs: { level: 3 }, content: [] };
    case "h4":
      return { type: "heading", attrs: { level: 4 }, content: [] };
    case "h5":
      return { type: "heading", attrs: { level: 5 }, content: [] };
    case "h6":
      return { type: "heading", attrs: { level: 6 }, content: [] };
    case "p":
      return { type: "paragraph", content: [] };
    case "ul":
      return { type: "bulletList", content: [] };
    case "ol":
      return { type: "orderedList", content: [] };
    case "li":
      return { type: "listItem", content: [] };
    case "blockquote":
      return { type: "blockquote", content: [] };
    case "strong":
    case "b":
      return { type: "__mark_bold", content: [] };
    case "em":
    case "i":
      return { type: "__mark_italic", content: [] };
    case "a":
      return {
        type: "__mark_link",
        attrs: { href: attrs?.href ?? "" },
        content: [],
      };
    default:
      return null;
  }
}

function isBlockTag(tag: string): boolean {
  return [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "div",
  ].includes(tag);
}

function isInlineTag(tag: string): boolean {
  return ["strong", "b", "em", "i", "a", "span", "code"].includes(tag);
}

function nodeMatchesTag(node: TTNode, tag: string): boolean {
  const map: Record<string, string[]> = {
    p: ["paragraph"],
    h1: ["heading"],
    h2: ["heading"],
    h3: ["heading"],
    h4: ["heading"],
    h5: ["heading"],
    h6: ["heading"],
    ul: ["bulletList"],
    ol: ["orderedList"],
    li: ["listItem"],
    blockquote: ["blockquote"],
    strong: ["__mark_bold"],
    b: ["__mark_bold"],
    em: ["__mark_italic"],
    i: ["__mark_italic"],
    a: ["__mark_link"],
  };
  return (map[tag] ?? []).includes(node.type);
}

function isBlockNode(node: TTNode): boolean {
  return [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "blockquote",
    "infoBlock",
    "horizontalRule",
    "codeBlock",
    "image",
    "root",
    "doc",
  ].includes(node.type);
}

function collectMarks(
  stack: TTNode[],
): { type: string; attrs?: Record<string, unknown> }[] {
  const marks: { type: string; attrs?: Record<string, unknown> }[] = [];
  for (const node of stack) {
    if (node.type === "__mark_bold") marks.push({ type: "bold" });
    else if (node.type === "__mark_italic") marks.push({ type: "italic" });
    else if (node.type === "__mark_link")
      marks.push({ type: "link", attrs: { href: node.attrs?.href } });
  }
  return marks;
}

function findNearestBlock(stack: TTNode[]): TTNode {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (isBlockNode(stack[i]) || stack[i].type === "root") return stack[i];
  }
  return stack[0];
}

/* ─── Color to TipTap variant mapping ─── */

function colorToVariant(
  color: string,
): "default" | "success" | "error" | "warning" | "info" {
  switch (color?.toLowerCase()) {
    case "red":
      return "error";
    case "green":
      return "success";
    case "blue":
      return "info";
    case "yellow":
    case "amber":
    case "orange":
      return "warning";
    default:
      return "default";
  }
}

/* ─── Content Block → TipTap nodes ─── */

function contentBlockToTipTap(block: Record<string, string>): TTNode[] {
  const nodes: TTNode[] = [];
  const blockType = block.block_type;
  const title = block.title || "";
  const html = block.content || "";
  const icon = block.icon || "Info";
  const color = block.color || "blue";

  if (blockType === "text") {
    // Add title as heading
    if (title) {
      nodes.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: title }],
      });
    }
    // Parse HTML content as regular TipTap nodes
    const parsed = htmlToTipTap(html);
    if (parsed.content) {
      nodes.push(...parsed.content);
    }
  } else if (blockType === "list") {
    // Convert to infoBlock — each line becomes its own paragraph (rendered as a separate card)
    const variant = colorToVariant(color);

    // The CSV list content is plain text with newlines separating items, not HTML <li> tags.
    // Split into individual items so each becomes its own card row.
    const plainText = stripHtml(html);
    const items = plainText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const contentNodes: TTNode[] = items.map((item) => ({
      type: "paragraph",
      content: [{ type: "text", text: item }],
    }));

    const infoBlock: TTNode = {
      type: "infoBlock",
      attrs: { icon, title, variant },
      content: contentNodes,
    };
    nodes.push(infoBlock);
  } else {
    // Fallback: treat as text
    if (title) {
      nodes.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: title }],
      });
    }
    const parsed = htmlToTipTap(html);
    if (parsed.content) nodes.push(...parsed.content);
  }

  return nodes;
}

/* ─── HTML → plain-text helpers (for structured About page content) ─── */

/** Strip HTML tags and return plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Split content into paragraphs (plain text). Handles both HTML <p> tags and double-newline separators. */
function htmlToParagraphs(content: string): string[] {
  const plain = stripHtml(content);
  // Split on double-newlines (paragraph breaks)
  return plain
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((s) => s.length > 0);
}

/** Extract list items from HTML content (plain text lines) */
function htmlToListItems(html: string): string[] {
  // Try splitting by newlines first (the CSV content uses newlines as separators)
  const lines = stripHtml(html)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines;
}

/* ─── Slug helpers ─── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/* ─── Main Migration ─── */

async function main() {
  const csvDir = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
  );

  console.log("Reading CSV files...");
  const practiceAreas = parseCSV(path.join(csvDir, "PracticeArea_export.csv"));
  const contentBlocks = parseCSV(path.join(csvDir, "ContentBlock_export.csv"));
  const articles = parseCSV(path.join(csvDir, "Article_export.csv"));

  console.log(
    `  PracticeAreas: ${practiceAreas.length}, ContentBlocks: ${contentBlocks.length}, Articles: ${articles.length}`,
  );

  // Group content blocks by page_name (trim whitespace)
  const blocksByPage = new Map<string, Record<string, string>[]>();
  for (const block of contentBlocks) {
    const pageName = (block.page_name || "").trim();
    if (!pageName) continue;
    if (!blocksByPage.has(pageName)) blocksByPage.set(pageName, []);
    blocksByPage.get(pageName)!.push(block);
  }
  // Sort each group by order
  for (const [, blocks] of blocksByPage) {
    blocks.sort(
      (a, b) => parseInt(a.order || "0") - parseInt(b.order || "0"),
    );
  }

  // ── 1. Delete old seed services ──
  console.log("\nDeleting old seed services...");
  const seedSlugs = [
    "corporate-law",
    "real-estate",
    "litigation",
    "labor-law",
    "intellectual-property",
    "tax-law",
  ];
  for (const slug of seedSlugs) {
    try {
      await prisma.service.delete({ where: { slug } });
      console.log(`  Deleted: ${slug}`);
    } catch {
      // doesn't exist, skip
    }
  }

  // ── 2. Migrate Services (PracticeAreas + ContentBlocks) ──
  console.log("\nMigrating services...");

  // Also handle SexOffenses / FraudOffenses that have content blocks but no PracticeArea entry
  const extraPages = new Map<string, { title: string; icon: string }>();
  for (const [pageName] of blocksByPage) {
    const hasPracticeArea = practiceAreas.some(
      (pa) => pa.page_slug === pageName,
    );
    const isAbout = pageName.toLowerCase() === "about";
    if (!hasPracticeArea && !isAbout) {
      // Derive title from the first text block's title
      const blocks = blocksByPage.get(pageName)!;
      const firstBlock = blocks[0];
      extraPages.set(pageName, {
        title: firstBlock?.title || pageName,
        icon: firstBlock?.icon || "Shield",
      });
    }
  }

  // Process all PracticeAreas
  for (const pa of practiceAreas) {
    const slug = pa.page_slug.toLowerCase();
    const blocks = blocksByPage.get(pa.page_slug) ?? [];
    // Also check with trimmed/case variations
    const altBlocks = blocksByPage.get(` ${pa.page_slug}`) ?? [];
    const allBlocks = [...blocks, ...altBlocks].sort(
      (a, b) => parseInt(a.order || "0") - parseInt(b.order || "0"),
    );

    const tiptapNodes: TTNode[] = [];
    for (const block of allBlocks) {
      tiptapNodes.push(...contentBlockToTipTap(block));
    }

    const content: TTNode = { type: "doc", content: tiptapNodes };

    await prisma.service.upsert({
      where: { slug },
      update: {
        title: pa.title,
        description: pa.subtitle || pa.description || pa.title,
        content: content as unknown as Record<string, unknown>,
        icon: pa.icon || "Shield",
        order: parseInt(pa.order || "0"),
        isActive: true,
      },
      create: {
        title: pa.title,
        slug,
        description: pa.subtitle || pa.description || pa.title,
        content: content as unknown as Record<string, unknown>,
        icon: pa.icon || "Shield",
        order: parseInt(pa.order || "0"),
        isActive: true,
      },
    });
    console.log(
      `  Service: ${slug} (${pa.title}) — ${allBlocks.length} content blocks`,
    );
  }

  // Process extra pages (SexOffenses, FraudOffenses, etc.)
  for (const [pageName, meta] of extraPages) {
    const slug = pageName.toLowerCase();
    const blocks = blocksByPage.get(pageName) ?? [];

    const tiptapNodes: TTNode[] = [];
    for (const block of blocks) {
      tiptapNodes.push(...contentBlockToTipTap(block));
    }

    const content: TTNode = { type: "doc", content: tiptapNodes };

    // Get max order for positioning
    const maxOrder = practiceAreas.reduce(
      (max, pa) => Math.max(max, parseInt(pa.order || "0")),
      0,
    );

    await prisma.service.upsert({
      where: { slug },
      update: {
        title: meta.title,
        description: meta.title,
        content: content as unknown as Record<string, unknown>,
        icon: meta.icon,
        isActive: true,
      },
      create: {
        title: meta.title,
        slug,
        description: meta.title,
        content: content as unknown as Record<string, unknown>,
        icon: meta.icon,
        order: maxOrder + 1,
        isActive: true,
      },
    });
    console.log(
      `  Service (extra): ${slug} (${meta.title}) — ${blocks.length} content blocks`,
    );
  }

  // ── 3. Migrate About Page ──
  // The About page expects an AboutPageContent structure (hero, firmStory, attorney, values, cta),
  // NOT raw TipTap JSON. We map CSV blocks into the correct structure.
  console.log("\nMigrating About page content...");
  const aboutBlocks = blocksByPage.get("About") ?? [];
  if (aboutBlocks.length > 0) {
    // Sort by order
    aboutBlocks.sort(
      (a, b) => parseInt(a.order || "0") - parseInt(b.order || "0"),
    );

    // Build the structured AboutPageContent (only override fields we have data for)
    const aboutContent: Record<string, unknown> = {};

    for (const block of aboutBlocks) {
      const title = (block.title || "").trim();
      const html = block.content || "";

      if (title === "רקע מקצועי") {
        // Professional background → firmStory paragraphs
        const paragraphs = htmlToParagraphs(html);
        aboutContent.firmStory = {
          title: "הסיפור שלנו",
          subtitle: "מסורת של מצוינות משפטית ושירות אישי",
          paragraphs,
        };
        console.log(
          `  About: firmStory — ${paragraphs.length} paragraphs from "${title}"`,
        );
      } else if (title === "רקע אישי") {
        // Personal background → attorney bio
        const bio = htmlToParagraphs(html);
        aboutContent.attorney = {
          name: 'עו"ד גיא זומר',
          role: "מייסד ומנהל המשרד",
          bio,
          credentials: [
            {
              icon: "GraduationCap",
              text: "LL.B, הפקולטה למשפטים",
            },
            {
              icon: "BookOpen",
              text: "חבר לשכת עורכי הדין בישראל",
            },
            {
              icon: "Award",
              text: "ניסיון מקצועי נרחב בתחום המשפט הציבורי וחופש המידע",
            },
          ],
        };
        console.log(
          `  About: attorney — ${bio.length} bio paragraphs from "${title}"`,
        );
      } else if (title === "ערכים מקצועיים") {
        // Professional values → values items
        const lines = htmlToListItems(html);
        const items = lines.map((line) => {
          // Each line is like "משפט – ייצוג משפטי מעמיק..."
          const dashIdx = line.indexOf("–");
          if (dashIdx > 0) {
            return {
              icon: "Award",
              title: line.substring(0, dashIdx).trim(),
              description: line.substring(dashIdx + 1).trim(),
            };
          }
          return { icon: "Award", title: line, description: "" };
        });
        aboutContent.values = {
          title: "הערכים שלנו",
          subtitle:
            "העקרונות שמנחים אותנו בכל פעולה ובכל ייצוג משפטי",
          items,
        };
        console.log(
          `  About: values — ${items.length} items from "${title}"`,
        );
      }
    }

    try {
      await prisma.page.update({
        where: { slug: "about" },
        data: {
          content: aboutContent,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
      console.log(`  Updated About page with ${aboutBlocks.length} blocks`);
    } catch (e) {
      console.log(`  About page not found, creating...`);
      await prisma.page.create({
        data: {
          slug: "about",
          title: "אודות",
          content: aboutContent,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    }
  }

  // ── 4. Migrate Articles → Posts ──
  console.log("\nMigrating articles...");

  // Find an admin user for authorId
  const adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    console.log(
      "  WARNING: No user found in database. Creating a placeholder user...",
    );
  }
  let authorId: string;
  if (adminUser) {
    authorId = adminUser.id;
    console.log(`  Using author: ${adminUser.email}`);
  } else {
    // Create a placeholder
    const user = await prisma.user.create({
      data: {
        email: "guy@z-g.co.il",
        name: "גיא זומר",
        role: "ADMIN",
      },
    });
    authorId = user.id;
    console.log(`  Created placeholder user: guy@z-g.co.il`);
  }

  // Filter articles with actual content, deduplicate by title
  const seen = new Set<string>();
  const validArticles: Record<string, string>[] = [];
  for (const article of articles) {
    const content = article.content || "";
    if (content.length < 20) continue;
    if (seen.has(article.title)) continue;
    seen.add(article.title);
    validArticles.push(article);
  }

  // Build slug from category + index
  const categoryCounter = new Map<string, number>();
  for (const article of validArticles) {
    const category = article.category || "general";
    const catSlug = slugify(category);
    const count = (categoryCounter.get(catSlug) || 0) + 1;
    categoryCounter.set(catSlug, count);

    const slug = `${catSlug}-${count}`;
    const content = htmlToTipTap(article.content || "");
    const status =
      article.published === "true" ? "PUBLISHED" : ("DRAFT" as const);

    // Parse tags
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(article.tags || "[]");
      if (Array.isArray(parsed)) tags = parsed;
    } catch {
      // ignore
    }

    await prisma.post.upsert({
      where: { slug },
      update: {
        title: article.title,
        content: content as unknown as Record<string, unknown>,
        excerpt: article.excerpt || null,
        coverImage: article.featured_image || null,
        status,
        category: article.category || null,
        tags,
        authorId,
      },
      create: {
        title: article.title,
        slug,
        content: content as unknown as Record<string, unknown>,
        excerpt: article.excerpt || null,
        coverImage: article.featured_image || null,
        status,
        category: article.category || null,
        tags,
        authorId,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });
    console.log(`  Post: ${slug} — "${article.title.substring(0, 60)}..."`);
  }

  console.log("\nMigration complete!");
  console.log(
    `  Services: ${practiceAreas.length + extraPages.size}, Posts: ${validArticles.length}, About: ${aboutBlocks.length > 0 ? "updated" : "skipped"}`,
  );
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
