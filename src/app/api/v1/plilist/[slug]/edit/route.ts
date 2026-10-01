import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logApiCall, requireApiKey, validateTiptapDoc } from "@/lib/api-keys";
import { readJsonBody } from "@/lib/request-body";

/**
 * Editing an existing הפליליסט post, published ones included. Scope:
 * plilist:edit. The /api/v1/articles/<slug> pattern, for the blog:
 *
 *   GET /api/v1/plilist/<slug>/edit  — the post's content and updatedAt
 *   PUT /api/v1/plilist/<slug>/edit  — replace its content (and optionally
 *                                      title, excerpt, tags, SEO fields)
 *
 * Never creates or deletes a post, never changes status, slug, publish date
 * or case tag. A PUT must send the updatedAt it read (baseUpdatedAt); if the
 * post changed since — in the admin editor, say — it is refused with 409
 * rather than overwriting that change. The replaced version goes to
 * plilist_revisions.
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
  const authz = await requireApiKey(req, "plilist:edit");
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
      tags: post.tags,
      seoTitle: post.seoTitle,
      seoDesc: post.seoDesc,
      content: post.content,
      updatedAt: post.updatedAt.toISOString(),
      adminUrl: `/admin/plilist/${post.id}`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "plilist:edit");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const { slug } = await ctx.params;
  const done = async (status: number, body: unknown) => {
    await logApiCall(caller, req, status, `plilist-edit:${slug}`);
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

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.plilistPost.findUnique({ where: { slug } });
    if (!current) return { status: 404 as const };
    if (current.updatedAt.toISOString() !== new Date(baseUpdatedAt).toISOString()) {
      return { status: 409 as const, updatedAt: current.updatedAt.toISOString() };
    }
    await tx.plilistRevision.create({
      data: {
        postId: current.id,
        title: current.title,
        excerpt: current.excerpt,
        content: current.content as object,
        replacedBy: `api:${caller.keyId}`,
      },
    });
    const post = await tx.plilistPost.update({
      where: { id: current.id },
      data: { ...fields, content: content as object },
    });
    return { status: 200 as const, post };
  });

  if (result.status === 404) return done(404, { error: "not found; this endpoint does not create posts" });
  if (result.status === 409) {
    return done(409, {
      error: "the post changed since you read it; GET it again and reapply your edit",
      updatedAt: result.updatedAt,
    });
  }
  const { post } = result;
  return done(200, {
    id: post.id,
    slug: post.slug,
    status: post.status,
    updatedAt: post.updatedAt.toISOString(),
    url: `/haplilist/${post.slug}`,
  });
}
