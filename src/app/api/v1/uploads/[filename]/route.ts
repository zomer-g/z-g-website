import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logApiCall, requireApiKey } from "@/lib/api-keys";

/**
 * Upload a PDF for a case file. Scope: cases:write.
 *
 *   PUT /api/v1/uploads/api-<name>.pdf   body: the raw PDF bytes
 *
 * Served afterwards at /uploads/api-<name>.pdf like any admin upload. The
 * name must start with "api-", so a key can only ever create or replace files
 * that keys created — never an upload made in the admin or a seed file.
 * PDF only (checked by magic bytes, not by the header), 10MB max.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ filename: string }> };

const NAME_RE = /^api-[a-z0-9][a-z0-9._-]{0,100}\.pdf$/;
const MAX_BYTES = 10 * 1024 * 1024;

export async function PUT(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "cases:write");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const { filename } = await ctx.params;
  const done = async (status: number, body: unknown) => {
    await logApiCall(caller, req, status, `upload:${filename}`);
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  };

  if (!NAME_RE.test(filename)) {
    return done(400, { error: "filename must be api-<lowercase latin, digits, . _ ->.pdf" });
  }

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return done(413, { error: "max 10MB" });

  const data = new Uint8Array(await req.arrayBuffer());
  if (data.length === 0) return done(400, { error: "empty body" });
  if (data.length > MAX_BYTES) return done(413, { error: "max 10MB" });
  // "%PDF-"
  if (!(data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46 && data[4] === 0x2d)) {
    return done(415, { error: "not a PDF" });
  }

  const existing = await prisma.uploadedFile.findUnique({ where: { filename }, select: { size: true } });
  await prisma.uploadedFile.upsert({
    where: { filename },
    update: { data, size: data.length, mimeType: "application/pdf" },
    create: { filename, data, size: data.length, mimeType: "application/pdf" },
  });

  return done(existing ? 200 : 201, { url: `/uploads/${filename}`, size: data.length, created: !existing });
}
