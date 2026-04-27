// Walks every Hebrew string the public site renders so we can hand them to
// the proofreading LLM. Used both from the CLI script and from the admin UI
// — keep the logic in one place so both stay in sync.

import { prisma } from "@/lib/prisma";
import { CONTENT_DEFAULTS } from "@/lib/content-defaults";

export interface ContentItem {
  source: string;
  text: string;
}

const MIN_TEXT_LEN = 4;
const MAX_TEXT_LEN = 2000;

export function isHebrewish(s: string): boolean {
  if (!/[֐-׿]/.test(s)) return false;
  const trimmed = s.trim();
  if (trimmed.length < MIN_TEXT_LEN || trimmed.length > MAX_TEXT_LEN) return false;
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
    select: {
      slug: true, content: true, draftContent: true,
      title: true, seoTitle: true, seoDesc: true,
    },
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
    select: {
      slug: true, title: true, excerpt: true, content: true,
      seoTitle: true, seoDesc: true,
    },
  });
  for (const p of posts) {
    if (p.title) out.push({ source: `db:Post[${p.slug}]:title`, text: p.title });
    if (p.excerpt) out.push({ source: `db:Post[${p.slug}]:excerpt`, text: p.excerpt });
    if (p.seoTitle) out.push({ source: `db:Post[${p.slug}]:seoTitle`, text: p.seoTitle });
    if (p.seoDesc) out.push({ source: `db:Post[${p.slug}]:seoDesc`, text: p.seoDesc });
    if (p.content) walkValue(p.content, `db:Post[${p.slug}]:content`, out);
  }
  return out.filter((i) => isHebrewish(i.text));
}

async function collectFromServices(): Promise<ContentItem[]> {
  const out: ContentItem[] = [];
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: {
      slug: true, title: true, description: true, content: true,
      seoTitle: true, seoDesc: true,
    },
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

function dedupe(items: ContentItem[]): ContentItem[] {
  const seen = new Map<string, ContentItem>();
  for (const it of items) if (!seen.has(it.text)) seen.set(it.text, it);
  return Array.from(seen.values());
}

export async function collectAllContent(): Promise<ContentItem[]> {
  const all = [
    ...(await collectFromDefaults()),
    ...(await collectFromPages()),
    ...(await collectFromPosts()),
    ...(await collectFromServices()),
    ...(await collectFromMediaAppearances()),
  ];
  return dedupe(all);
}
