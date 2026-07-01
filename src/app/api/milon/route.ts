import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  if (all) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN")
      return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  try {
    const entries = await prisma.milonEntry.findMany({
      where: all ? undefined : { status: "PUBLISHED" },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "שגיאה בטעינת הערכים" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  try {
    const body = await req.json();
    const entry = await prisma.milonEntry.create({ data: body });
    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "שגיאה ביצירת הערך" }, { status: 500 });
  }
}
