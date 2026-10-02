import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logApiCall, requireApiKey } from "@/lib/api-keys";
import { readJsonBody } from "@/lib/request-body";

/**
 * Write API for the dictionary (/dictionary). Scope: milon:write.
 *
 *   GET /api/v1/milon/<slug>  — the entry, including a draft
 *   PUT /api/v1/milon/<slug>  — create or update it, status included
 *
 * No delete: removing an entry stays a human action in /admin/milon.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const entrySchema = z
  .object({
    term: z.string().trim().min(1).max(120),
    vocalized: z.string().trim().min(1).max(200),
    partOfSpeech: z.string().trim().min(1).max(60),
    etymology: z.string().max(1000).nullable().optional(),
    inflections: z.string().max(1000).nullable().optional(),
    domains: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
    definitions: z
      .array(
        z
          .object({
            text: z.string().trim().min(1).max(2000),
            label: z.string().max(60).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    example: z.string().trim().min(1).max(2000),
    order: z.number().int().min(0).max(100000).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

function slugOk(slug: string) {
  return slug.length <= 120 && SLUG_RE.test(slug);
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "milon:write");
  if (!authz.ok) return authz.response;

  const { slug } = await ctx.params;
  const entry = slugOk(slug) ? await prisma.milonEntry.findUnique({ where: { slug } }) : null;
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "milon:write");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const { slug } = await ctx.params;
  if (!slugOk(slug)) {
    await logApiCall(caller, req, 400, `milon:${slug.slice(0, 120)}`);
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  const body = await readJsonBody(req, 64 * 1024);
  if (!body.ok) return body.response;

  const parsed = entrySchema.safeParse(body.data);
  if (!parsed.success) {
    await logApiCall(caller, req, 400, `milon:${slug}`);
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    definitions: parsed.data.definitions.map((d) => ({ text: d.text, label: d.label ?? "" })),
  };

  const existing = await prisma.milonEntry.findUnique({ where: { slug } });
  let entry;
  if (existing) {
    entry = await prisma.milonEntry.update({ where: { slug }, data });
  } else {
    // New entries go to the end unless an order is given.
    const last = await prisma.milonEntry.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    entry = await prisma.milonEntry.create({
      data: { ...data, slug, order: data.order ?? (last?.order ?? 0) + 1 },
    });
  }

  const status = existing ? 200 : 201;
  await logApiCall(caller, req, status, `milon:${slug}`);
  return NextResponse.json(
    { id: entry.id, slug: entry.slug, created: !existing, status: entry.status },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
