import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { serviceSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

/* ---- GET /api/services/[id] ---- */

export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { error: "השירות לא נמצא" },
        { status: 404 },
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("GET /api/services/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת השירות" },
      { status: 500 },
    );
  }
}

/* ---- PUT /api/services/[id] ---- */

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

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "השירות לא נמצא" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = serviceSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const service = await prisma.service.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("PUT /api/services/[id] error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "כתובת URL (slug) כבר קיימת. בחרו כתובת אחרת." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "שגיאה בעדכון השירות" },
      { status: 500 },
    );
  }
}

/* ---- DELETE /api/services/[id] ---- */

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

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "השירות לא נמצא" },
        { status: 404 },
      );
    }

    await prisma.service.delete({ where: { id } });

    return NextResponse.json({ message: "השירות נמחק בהצלחה" });
  } catch (error) {
    console.error("DELETE /api/services/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת השירות" },
      { status: 500 },
    );
  }
}
