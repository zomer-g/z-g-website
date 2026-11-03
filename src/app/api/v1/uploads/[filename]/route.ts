import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type ApiScope, logApiCall, requireAnyApiKeyScope } from "@/lib/api-keys";
import { checkUpload, kindFromName } from "@/lib/upload-type";

/**
 * Upload a PDF for a case file, or an image (e.g. a screenshot for a draft).
 *
 *   PUT /api/v1/uploads/api-<name>.pdf                 scope: cases:write
 *   PUT /api/v1/uploads/api-<name>.png|jpg|jpeg|webp   scope: cases:write or plilist:draft
 *   body: the raw file bytes
 *
 * Served afterwards at /uploads/api-<name>.<ext> like any admin upload, with
 * the detected Content-Type. The name must start with "api-", so a key can
 * only ever create or replace files that keys created — never an upload made
 * in the admin or a seed file. The type is checked by magic bytes, not by the
 * header, and must match the extension. No SVG (it can carry script). 10MB max.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ filename: string }> };

const MAX_BYTES = 10 * 1024 * 1024;

// Images are for drafts too, so a draft-only key may upload them; a PDF goes
// into a case file and still needs cases:write.
const PDF_SCOPES: ApiScope[] = ["cases:write"];
const IMAGE_SCOPES: ApiScope[] = ["cases:write", "plilist:draft"];

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { filename } = await ctx.params;
  const named = kindFromName(filename);

  // A bad name is still answered (and logged) only to a valid key.
  const authz = await requireAnyApiKeyScope(req, named === "pdf" ? PDF_SCOPES : IMAGE_SCOPES);
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const done = async (status: number, body: unknown) => {
    await logApiCall(caller, req, status, `upload:${filename}`);
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  };

  if (!named) {
    return done(400, { error: "filename must be api-<lowercase latin, digits, . _ ->.(pdf|png|jpg|jpeg|webp)" });
  }

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return done(413, { error: "max 10MB" });

  const data = new Uint8Array(await req.arrayBuffer());
  if (data.length === 0) return done(400, { error: "empty body" });
  if (data.length > MAX_BYTES) return done(413, { error: "max 10MB" });

  const checked = checkUpload(filename, data);
  if (!checked.ok) return done(checked.status, { error: checked.error });
  const { mimeType } = checked;

  const existing = await prisma.uploadedFile.findUnique({ where: { filename }, select: { size: true } });
  await prisma.uploadedFile.upsert({
    where: { filename },
    update: { data, size: data.length, mimeType },
    create: { filename, data, size: data.length, mimeType },
  });

  return done(existing ? 200 : 201, {
    url: `/uploads/${filename}`,
    size: data.length,
    mimeType,
    created: !existing,
  });
}
