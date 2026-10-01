import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logApiCall, requireApiKey, validateTiptapDoc } from "@/lib/api-keys";
import { readJsonBody } from "@/lib/request-body";

/**
 * Write API for editing an existing article (/articles). Scope: articles:edit.
 *
 *   GET /api/v1/articles/<slug>  — the article's TipTap content and updatedAt
 *   PUT /api/v1/articles/<slug>  — replace its content (and optionally title,
 *                                  excerpt, tags, SEO fields)
 *
 * Unlike plilist:draft this reaches published articles, so it is narrow on
 * purpose: it never creates or deletes an article and never changes its
 * status, slug or publish date. A PUT must send the updatedAt it read
 * (baseUpdatedAt); if the article changed since — say, in the admin editor —
 * the edit is refused with 409 instead of overwriting that change. The
 * version being replaced is kept in post_revisions.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BODY = 1024 * 1024;

const editSchema = z
  .object({
    baseUpdatedAt: z.string().datetime(),
    content: z.unknown(),
    title: z.string().trim().min(1).max(300).optional(),
    excerpt: z.string().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    seoTitle: z.string().max(300).optional(),
    seoDesc: z.string().max(2000).optional(),
  })
  .strict();

const slugOk = (slug: string) => slug.length <= 120 && SLUG_RE.test(slug);

export async function GET(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "articles:edit");
  if (!authz.ok) return authz.response;

  const { slug } = await ctx.params;
  const post = slugOk(slug) ? await prisma.post.findUnique({ where: { slug } }) : null;
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(
    {
      id: post.id,
      slug: post.slug,
      status: post.status,
      title: post.title,
      excerpt: post.excerpt,
      tags: post.tags,
      content: post.content,
      updatedAt: post.updatedAt.toISOString(),
      adminUrl: `/admin/posts/${post.id}`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "articles:edit");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const { slug } = await ctx.params;
  const done = async (status: number, body: unknown) => {
    await logApiCall(caller, req, status, `article:${slug}`);
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  };

  if (!slugOk(slug)) return done(400, { error: "bad slug" });

  const body = await readJsonBody(req, MAX_BODY);
  if (!body.ok) return body.response;

  const parsed = editSchema.safeParse(body.data);
  if (!parsed.success) return done(400, { error: "invalid body", details: parsed.error.flatten() });

  const contentError = validateTiptapDoc(parsed.data.content);
  if (contentError) return done(400, { error: contentError });

  const { baseUpdatedAt, content, ...fields } = parsed.data;

  // Revision + update in one transaction, guarded on updatedAt, so a change
  // made in between (admin editor, another key) is never silently lost.
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.post.findUnique({ where: { slug } });
    if (!current) return { status: 404 as const };
    if (current.updatedAt.toISOString() !== new Date(baseUpdatedAt).toISOString()) {
      return { status: 409 as const, updatedAt: current.updatedAt.toISOString() };
    }
    await tx.postRevision.create({
      data: {
        postId: current.id,
        title: current.title,
        excerpt: current.excerpt,
        content: current.content as object,
        replacedBy: `api:${caller.keyId}`,
      },
    });
    const post = await tx.post.update({
      where: { id: current.id },
      data: { ...fields, content: content as object },
    });
    return { status: 200 as const, post };
  });

  if (result.status === 404) return done(404, { error: "not found; the API does not create articles" });
  if (result.status === 409) {
    return done(409, {
      error: "the article changed since you read it; GET it again and reapply your edit",
      updatedAt: result.updatedAt,
    });
  }
  const { post } = result;
  return done(200, {
    id: post.id,
    slug: post.slug,
    status: post.status,
    updatedAt: post.updatedAt.toISOString(),
    url: `/articles/${post.slug}`,
  });
}
