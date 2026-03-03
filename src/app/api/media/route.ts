import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ---- GET /api/media ---- */

export async function GET() {
  try {
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
