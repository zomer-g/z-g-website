import { NextRequest, NextResponse } from "next/server";
import { logApiCall, requireApiKey } from "@/lib/api-keys";
import { planReplace, replaceUpload } from "@/lib/upload-replace";
import { isPdf, isReplaceableName, STAMP_RE } from "@/lib/upload-replace-names";

/**
 * Replace an existing uploaded PDF with a re-redacted version. Scope: uploads:replace.
 *
 *   PUT /api/v1/uploads/<name>.pdf/replace?stamp=YYYYMMDD           body: the raw PDF bytes
 *   PUT /api/v1/uploads/<name>.pdf/replace?stamp=YYYYMMDD&dryRun=1  report only
 *
 * The current bytes are kept as <name>-pre-redaction-<stamp>.pdf, marked
 * non-public before they are written (see src/lib/upload-replace.ts). Unlike
 * PUT /api/v1/uploads/<name>, any name works — but only one already in
 * uploaded_files: this route never creates a new public name.
 * PDF only (magic bytes), 10MB max — the proxy truncates bigger bodies.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ filename: string }> };

const MAX_BYTES = 10 * 1024 * 1024;

export async function PUT(req: NextRequest, ctx: Ctx) {
  const authz = await requireApiKey(req, "uploads:replace");
  if (!authz.ok) return authz.response;
  const { caller } = authz;

  const { filename } = await ctx.params;
  const done = async (status: number, body: unknown) => {
    await logApiCall(caller, req, status, `replace:${filename}`);
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  };

  if (!isReplaceableName(filename)) return done(400, { error: "filename must be a bare <name>.pdf that is not a backup" });

  const stamp = req.nextUrl.searchParams.get("stamp") ?? "";
  if (!STAMP_RE.test(stamp)) return done(400, { error: "stamp=YYYYMMDD is required" });
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return done(413, { error: "max 10MB" });

  const data = new Uint8Array(await req.arrayBuffer());
  if (data.length > MAX_BYTES) return done(413, { error: "max 10MB" });
  if (!isPdf(data)) return done(415, { error: "not a PDF" });

  try {
    const plan = await planReplace(filename, data.length, stamp);
    if (!plan) return done(404, { error: `${filename} is not in uploaded_files — refusing to create it` });
    if (!dryRun) await replaceUpload(plan, data);
    return done(200, { ...plan, dryRun, url: `/uploads/${filename}`, backupUrl: `/uploads/${plan.backup}` });
  } catch (err) {
    console.error("PUT /api/v1/uploads/[filename]/replace error:", err);
    return done(500, { error: "server error" });
  }
}
