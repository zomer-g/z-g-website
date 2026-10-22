import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPrivateFiles } from "@/lib/private-files";

/**
 * Serves uploaded files at /uploads/<filename>.
 *
 * Uploads made through /api/media/upload are stored in the uploaded_files
 * table, because the container filesystem is wiped on every deploy. Anything
 * not in the table is read from public/uploads as before: the git-committed
 * seed files, and any runtime upload still sitting on a Render disk.
 *
 * Why a route at all: `next start` only serves files that were in `public/` at
 * BUILD time. Seed files copied in before the build are served statically and
 * never reach this handler; every static miss falls through to it.
 */

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

function fileResponse(
  data: Uint8Array<ArrayBuffer>,
  contentType: string,
  filename: string,
  isPrivate: boolean,
) {
  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      // Short on purpose: an admin can hide a file at any time (/admin/files),
      // and a year-long immutable copy would outlive that. A hidden file that
      // an admin is viewing must not land in any shared cache at all.
      "Cache-Control": isPrivate ? "private, no-store" : "public, max-age=3600",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

/**
 * Files an admin marked non-public answer 404 to everyone but an admin.
 * proxy.ts enforces the same rule, but a proxy can be bypassed (Next.js has
 * shipped more than one such bug), so the route that actually hands out the
 * bytes checks for itself rather than trusting that the proxy ran.
 */
async function isPrivateAndNotAdmin(filename: string): Promise<{ isPrivate: boolean; deny: boolean }> {
  const isPrivate = (await getPrivateFiles()).has(filename);
  if (!isPrivate) return { isPrivate: false, deny: false };
  const session = await auth();
  return { isPrivate: true, deny: session?.user?.role !== "ADMIN" };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Reject anything that isn't a bare filename (no path traversal).
  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..")
  ) {
    return notFound();
  }

  const { isPrivate, deny } = await isPrivateAndNotAdmin(filename);
  if (deny) return notFound();

  try {
    const stored = await prisma.uploadedFile.findUnique({
      where: { filename },
      select: { data: true, mimeType: true },
    });
    if (stored) {
      return fileResponse(new Uint8Array(stored.data), stored.mimeType, filename, isPrivate);
    }
  } catch (err) {
    // A database hiccup should not hide a file that is also on disk.
    console.error("GET /uploads: uploaded_files lookup failed:", err);
  }

  const uploadsDir = path.resolve(path.join(process.cwd(), "public", "uploads"));
  const filePath = path.resolve(path.join(uploadsDir, filename));

  // Ensure the resolved path stays inside the uploads directory.
  if (filePath !== uploadsDir && !filePath.startsWith(uploadsDir + path.sep)) {
    return notFound();
  }

  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch {
    return notFound();
  }

  const ext = path.extname(filePath).toLowerCase();
  return fileResponse(
    new Uint8Array(data),
    CONTENT_TYPES[ext] ?? "application/octet-stream",
    filename,
    isPrivate,
  );
}
