import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSafeUrl, logApiCall, requireApiKey } from "@/lib/api-keys";
import { readJsonBody } from "@/lib/request-body";

/**
 * Create or update a document in a case file (the list under a הפליליסט post
 * with a caseTag). Scope: cases:write.
 *
 *   PUT /api/v1/case-documents   — matched on (caseTag, fileUrl), else
 *                                  (caseTag, sourceUrl), else (caseTag, title)
 *
 * No delete: removing a document stays a human action in
 * /admin/case-documents (isActive:false hides one).
 */

export const dynamic = "force-dynamic";

const fileUrl = z
  .string()
  .max(2048)
  .refine((u) => /^\/uploads\/[^/]+$/.test(u) || /^https:\/\//i.test(u), "fileUrl must be /uploads/<file> or https");
const httpsUrl = z.string().max(2048).refine((u) => /^https?:\/\//i.test(u) && isSafeUrl(u), "must be an http(s) url");

const docSchema = z
  .object({
    caseTag: z.string().regex(/^[a-z0-9-]{1,64}$/),
    category: z.enum(["letter", "court", "ruling", "law"]),
    title: z.string().trim().min(1).max(300),
    description: z.string().max(4000).nullable().optional(),
    docDate: z.string().max(40).nullable().optional(),
    sortDate: z.string().datetime().nullable().optional(),
    citation: z.string().max(300).nullable().optional(),
    authority: z.string().max(300).nullable().optional(),
    fileUrl: fileUrl.nullable().optional(),
    sourceUrl: httpsUrl.nullable().optional(),
    order: z.number().int().min(0).max(10_000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function PUT(req: NextRequest) {
  const authz = await requireApiKey(req, "cases:write");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const body = await readJsonBody(req, 64 * 1024);
  if (!body.ok) return body.response;

  const parsed = docSchema.safeParse(body.data);
  if (!parsed.success) {
    await logApiCall(caller, req, 400);
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { sortDate, ...rest } = parsed.data;
  const data = { ...rest, sortDate: sortDate ? new Date(sortDate) : sortDate };

  const match = rest.fileUrl
    ? { caseTag: rest.caseTag, fileUrl: rest.fileUrl }
    : rest.sourceUrl
      ? { caseTag: rest.caseTag, sourceUrl: rest.sourceUrl }
      : { caseTag: rest.caseTag, title: rest.title };

  const existing = await prisma.caseDocument.findFirst({ where: match });
  const doc = existing
    ? await prisma.caseDocument.update({ where: { id: existing.id }, data })
    : await prisma.caseDocument.create({ data });

  const status = existing ? 200 : 201;
  await logApiCall(caller, req, status, `case:${doc.caseTag}:${doc.id}`);
  return NextResponse.json(
    { id: doc.id, created: !existing, isActive: doc.isActive },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
