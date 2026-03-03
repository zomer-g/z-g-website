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
    if (!session?.user?.id) {
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

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), "public", media.url);
      await unlink(filePath);
    } catch {
      // File may not exist on disk, continue with DB deletion
      console.warn(`Could not delete file from disk: ${media.url}`);
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
