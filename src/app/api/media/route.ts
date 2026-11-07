import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/* ---- GET /api/media ---- */

export async function GET() {
  try {
    // Admin-only: it lists every upload, files marked private included.
    // Its one caller is the admin media library.
    if ((await auth())?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "נדרשת הזדהות לביצוע פעולה זו" }, { status: 401 });
    }
    const media = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("GET /api/media error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת המדיה" },
      { status: 500 },
    );
  }
}
