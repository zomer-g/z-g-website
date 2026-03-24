import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mediaAppearanceSchema } from "@/lib/validations";

/* ---- GET /api/media-appearances ---- */

export async function GET() {
  try {
    const appearances = await prisma.mediaAppearance.findMany({
      orderBy: { date: "desc" },
    });

    return NextResponse.json(appearances);
  } catch (error) {
    console.error("GET /api/media-appearances error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הופעות המדיה" },
      { status: 500 },
    );
  }
}

/* ---- POST /api/media-appearances ---- */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = mediaAppearanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const appearance = await prisma.mediaAppearance.create({
      data: parsed.data,
    });

    return NextResponse.json(appearance, { status: 201 });
  } catch (error) {
    console.error("POST /api/media-appearances error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת הופעת מדיה" },
      { status: 500 },
    );
  }
}
