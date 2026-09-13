import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

type RouteContext = { params: Promise<{ id: string }> };

/* ---- DELETE /api/media/[id] ---- */

export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json(
        { error: "הקובץ לא נמצא" },
        { status: 404 },
      );
    }

    // Uploads live in uploaded_files; a file from before that table may still
    // be on disk. Remove whichever exists.
    if (media.url.startsWith("/uploads/")) {
      await prisma.uploadedFile.deleteMany({
        where: { filename: decodeURIComponent(media.url.slice("/uploads/".length)) },
      });
    }
    try {
      const filePath = path.join(process.cwd(), "public", media.url);
      await unlink(filePath);
    } catch {
      // Not on disk — the normal case for uploads stored in the database.
    }

    // Delete record from database
    await prisma.media.delete({ where: { id } });

    return NextResponse.json({ message: "הקובץ נמחק בהצלחה" });
  } catch (error) {
    console.error("DELETE /api/media/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת הקובץ" },
      { status: 500 },
    );
  }
}
