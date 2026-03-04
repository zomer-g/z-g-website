import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mediaAppearanceSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

/* ---- GET /api/media-appearances/[id] ---- */

export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const appearance = await prisma.mediaAppearance.findUnique({
      where: { id },
    });

    if (!appearance) {
      return NextResponse.json(
        { error: "הופעת המדיה לא נמצאה" },
        { status: 404 },
      );
    }

    return NextResponse.json(appearance);
  } catch (error) {
    console.error("GET /api/media-appearances/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הופעת המדיה" },
      { status: 500 },
    );
  }
}

/* ---- PUT /api/media-appearances/[id] ---- */

export async function PUT(
  req: NextRequest,
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

    const existing = await prisma.mediaAppearance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "הופעת המדיה לא נמצאה" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = mediaAppearanceSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const appearance = await prisma.mediaAppearance.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(appearance);
  } catch (error) {
    console.error("PUT /api/media-appearances/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון הופעת המדיה" },
      { status: 500 },
    );
  }
}

/* ---- DELETE /api/media-appearances/[id] ---- */

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

    const existing = await prisma.mediaAppearance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "הופעת המדיה לא נמצאה" },
        { status: 404 },
      );
    }

    await prisma.mediaAppearance.delete({ where: { id } });

    return NextResponse.json({ message: "הופעת המדיה נמחקה בהצלחה" });
  } catch (error) {
    console.error("DELETE /api/media-appearances/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת הופעת המדיה" },
      { status: 500 },
    );
  }
}
