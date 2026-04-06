import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/* ---- Allowed MIME types ---- */

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/* ---- Allowed file extensions (must match MIME type) ---- */
const MIME_TO_EXT: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
};

/* ---- POST /api/media/upload ---- */

export async function POST(req: NextRequest) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
    const limited = rateLimit(`upload:${getClientIp(req)}`, { limit: 20, windowMs: 60_000 });
    if (limited) return limited;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "לא נבחר קובץ להעלאה" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: "סוג קובץ לא נתמך. סוגים מותרים: JPEG, PNG, WebP, GIF, SVG, PDF",
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "גודל הקובץ חורג מהמגבלה (10MB)" },
        { status: 400 },
      );
    }

    // Validate file extension matches MIME type
    const fileExt = path.extname(file.name).toLowerCase();
    const allowedExts = MIME_TO_EXT[file.type];
    if (!allowedExts || !allowedExts.includes(fileExt)) {
      return NextResponse.json(
        { error: "סיומת הקובץ אינה תואמת את סוג הקובץ" },
        { status: 400 },
      );
    }

    // Generate unique filename
    const ext = fileExt;
    const timestamp = Date.now();
    const safeName = file.name
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9\u0590-\u05FF_-]/g, "_")
      .slice(0, 50);
    const filename = `${timestamp}-${safeName}${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // Create media record in database
    const url = `/uploads/${filename}`;
    const media = await prisma.media.create({
      data: {
        url,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        alt: formData.get("alt") as string | null,
      },
    });

    return NextResponse.json(
      { media, url },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/media/upload error:", error);
    return NextResponse.json(
      { error: "שגיאה בהעלאת הקובץ" },
      { status: 500 },
    );
  }
}
