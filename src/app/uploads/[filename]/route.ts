import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

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
  return new Response("Not found", { status: 404 });
}

function fileResponse(data: Uint8Array<ArrayBuffer>, contentType: string, filename: string) {
  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
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

  try {
    const stored = await prisma.uploadedFile.findUnique({
      where: { filename },
      select: { data: true, mimeType: true },
    });
    if (stored) {
      return fileResponse(new Uint8Array(stored.data), stored.mimeType, filename);
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
  );
}
