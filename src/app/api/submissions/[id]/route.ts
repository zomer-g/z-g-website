import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/* ---- PATCH /api/submissions/:id ---- */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await req.json();

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        ...(typeof body.isRead === "boolean" ? { isRead: body.isRead } : {}),
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error("PATCH /api/submissions/:id error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "הפנייה לא נמצאה" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "שגיאה בעדכון הפנייה" },
      { status: 500 },
    );
  }
}

/* ---- DELETE /api/submissions/:id ---- */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const { id } = await params;

    await prisma.submission.delete({ where: { id } });

    return NextResponse.json({ message: "הפנייה נמחקה בהצלחה" });
  } catch (error) {
    console.error("DELETE /api/submissions/:id error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "הפנייה לא נמצאה" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "שגיאה במחיקת הפנייה" },
      { status: 500 },
    );
  }
}
