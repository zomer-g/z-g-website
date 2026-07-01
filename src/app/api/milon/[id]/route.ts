import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const entry = await prisma.milonEntry.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const entry = await prisma.milonEntry.update({ where: { id }, data: body });
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.milonEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
