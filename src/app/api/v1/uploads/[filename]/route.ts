import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type ApiScope, logApiCall, requireAnyApiKeyScope } from "@/lib/api-keys";
import { checkUpload, kindFromName } from "@/lib/upload-type";
import { readCappedBody } from "@/lib/request-body";

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

  if (await prisma.uploadedFile.findUnique({ where: { filename }, select: { filename: true } })) {
    return done(409, { error: "file exists; uploads are create-only (use .../replace to change a PDF)" });
  }

  const data = await readCappedBody(req, MAX_BYTES);
  // `>=`, not `>`: proxy.ts runs on this route, and Next.js hands a route
  // behind a proxy at most 10MB of body, silently cutting a longer chunked
  // upload to exactly that length. A body of exactly the cap is therefore a
  // truncated file, not a whole one, and must not be stored.
  if (data === null || data.length >= MAX_BYTES) return done(413, { error: "max 10MB" });
  if (data.length === 0) return done(400, { error: "empty body" });

  const checked = checkUpload(filename, data);
  if (!checked.ok) return done(checked.status, { error: checked.error });
  const { mimeType } = checked;

  try {
    await prisma.uploadedFile.create({ data: { filename, data, size: data.length, mimeType } });
  } catch (err) {
    // A concurrent PUT of the same name won the race.
    if ((err as { code?: string }).code === "P2002") {
      return done(409, { error: "file exists; uploads are create-only (use .../replace to change a PDF)" });
    }
    throw err;
  }

  return done(201, {
    url: `/uploads/${filename}`,
    size: data.length,
    mimeType,
    created: true,
  });
}
