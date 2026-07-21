import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Serves user-uploaded files from the persistent uploads disk.
 *
 * Why this route exists: in production `next start` only serves files that were
 * present in `public/` at BUILD time. Files written to public/uploads at runtime
 * (post PDF attachments, admin media) live on the Render persistent disk but are
 * NOT in the build's static manifest, so Next's static handler 404s them. This
 * handler reads the file straight off disk and streams it back.
 *
 * Seed files committed to git (public/uploads/media-thumb-*.png) are in the build
 * manifest and keep being served statically — the static handler wins for those,
 * and only static misses (i.e. runtime uploads) fall through to this route.
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
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
