import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSafeUrl, logApiCall, requireApiKey } from "@/lib/api-keys";
import { readJsonBody } from "@/lib/request-body";

/**
 * Write API for the publications list (/media). Scope: media:write.
 *
 *   PUT /api/v1/media-appearances — create or update one item, matched on its
 *                                   url (the article's address)
 *
 * No delete: removing an item stays a human action in the admin.
 */

export const dynamic = "force-dynamic";

const httpUrl = z
  .string()
  .max(2048)
  .refine((u) => /^https?:\/\//i.test(u), "must be an http(s) url");

const itemSchema = z
  .object({
    url: httpUrl,
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(2000),
    type: z.enum(["video", "article", "podcast", "academic", "lecture"]),
    source: z.string().trim().min(1).max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    thumbnailUrl: z.string().max(2048).refine(isSafeUrl, "url scheme not allowed").optional(),
    isActive: z.boolean().optional(),
    caseTag: z
      .string()
      .regex(/^[a-z0-9-]{1,64}$/)
      .nullable()
      .optional(),
  })
  .strict();

export async function PUT(req: NextRequest) {
  const authz = await requireApiKey(req, "media:write");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const body = await readJsonBody(req, 64 * 1024);
  if (!body.ok) return body.response;

  const parsed = itemSchema.safeParse(body.data);
  if (!parsed.success) {
    await logApiCall(caller, req, 400);
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await prisma.mediaAppearance.findFirst({ where: { url: data.url } });
  const item = existing
    ? await prisma.mediaAppearance.update({ where: { id: existing.id }, data })
    : await prisma.mediaAppearance.create({ data: { ...data, isActive: data.isActive ?? true } });

  const status = existing ? 200 : 201;
  await logApiCall(caller, req, status, `media:${item.id}`);
  return NextResponse.json(
    { id: item.id, created: !existing, isActive: item.isActive },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
