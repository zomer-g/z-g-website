import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { caseDocumentSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND = { error: "מסמך התיק לא נמצא" };

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

/* ---- PUT /api/case-documents/[id] ---- */

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const existing = await prisma.caseDocument.findUnique({ where: { id } });
    if (!existing) return NextResponse.json(NOT_FOUND, { status: 404 });

    const body = await req.json();
    const parsed = caseDocumentSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const document = await prisma.caseDocument.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("PUT /api/case-documents/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון מסמך התיק" },
      { status: 500 },
    );
  }
}

/* ---- DELETE /api/case-documents/[id] ---- */

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const existing = await prisma.caseDocument.findUnique({ where: { id } });
    if (!existing) return NextResponse.json(NOT_FOUND, { status: 404 });

    await prisma.caseDocument.delete({ where: { id } });

    return NextResponse.json({ message: "מסמך התיק נמחק בהצלחה" });
  } catch (error) {
    console.error("DELETE /api/case-documents/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת מסמך התיק" },
      { status: 500 },
    );
  }
}
