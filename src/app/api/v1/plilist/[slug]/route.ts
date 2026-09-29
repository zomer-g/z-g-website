import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSafeUrl, logApiCall, requireApiKey, validateTiptapDoc } from "@/lib/api-keys";
import { readJsonBody } from "@/lib/request-body";

/**
 * Write API for הפליליסט drafts. Scope: plilist:draft.
 *
 *   GET /api/v1/plilist/<slug>  — the post, including a draft
 *   PUT /api/v1/plilist/<slug>  — create it as a DRAFT, or update it while
 *                                 it is still a DRAFT
 *
 * What a key can never do: publish, change the status, or touch a post that
 * is PUBLISHED or ARCHIVED. Publishing stays a human action in /admin/plilist.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BODY = 1024 * 1024;

const safeUrl = z.string().max(2048).refine(isSafeUrl, "url scheme not allowed");

const draftSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    content: z.unknown(),
    excerpt: z.string().max(2000).optional(),
    coverImage: safeUrl.optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    seoTitle: z.string().max(300).optional(),
    seoDesc: z.string().max(2000).optional(),
    attachments: z
      .array(z.object({ name: z.string().min(1).max(300), url: safeUrl }))
      .max(50)
      .optional(),
    caseTag: z
      .string()
      .regex(/^[a-z0-9-]{1,64}$/)
      .nullable()
      .optional(),
  })
  .strict();

function slugOk(slug: string) {
  return slug.length <= 120 && SLUG_RE.test(slug);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "plilist:draft");
  if (!authz.ok) return authz.response;

  const { slug } = await ctx.params;
  const post = slugOk(slug) ? await prisma.plilistPost.findUnique({ where: { slug } }) : null;
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(
    {
      id: post.id,
      slug: post.slug,
      status: post.status,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      tags: post.tags,
      caseTag: post.caseTag,
      updatedAt: post.updatedAt,
      adminUrl: `/admin/plilist/${post.id}`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "plilist:draft");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const { slug } = await ctx.params;
  const done = async (status: number, body: unknown) => {
    await logApiCall(caller, req, status, `plilist:${slug}`);
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  };

  if (!slugOk(slug)) return done(400, { error: "slug must be lowercase latin letters, digits and dashes" });

  const body = await readJsonBody(req, MAX_BODY);
  if (!body.ok) return body.response;

  const parsed = draftSchema.safeParse(body.data);
  if (!parsed.success) return done(400, { error: "invalid body", details: parsed.error.flatten() });

  const contentError = validateTiptapDoc(parsed.data.content);
  if (contentError) return done(400, { error: contentError });

  const existing = await prisma.plilistPost.findUnique({ where: { slug } });
  if (existing && existing.status !== "DRAFT") {
    return done(409, { error: `post is ${existing.status}; the API only edits drafts` });
  }

  const { content, ...fields } = parsed.data;
  const data = { ...fields, content: content as object };

  if (existing) {
    const post = await prisma.plilistPost.update({ where: { id: existing.id }, data });
    return done(200, { id: post.id, slug: post.slug, status: post.status, created: false, adminUrl: `/admin/plilist/${post.id}` });
  }

  const authorId = caller.createdBy;
  const author = authorId ? await prisma.user.findUnique({ where: { id: authorId } }) : null;
  if (!author || author.role !== "ADMIN") return done(403, { error: "key has no admin owner" });

  const post = await prisma.plilistPost.create({
    data: { ...data, slug, status: "DRAFT", authorId: author.id },
  });
  return done(201, { id: post.id, slug: post.slug, status: post.status, created: true, adminUrl: `/admin/plilist/${post.id}` });
}
