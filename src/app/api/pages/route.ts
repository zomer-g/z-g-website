import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { pageSchema } from "@/lib/validations";

/* ---- GET /api/pages ---- */

export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      orderBy: { slug: "asc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("GET /api/pages error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הדפים" },
      { status: 500 },
    );
  }
}

/* ---- PUT /api/pages ---- */

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { slug, ...rest } = body;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "slug נדרש לעדכון דף" },
        { status: 400 },
      );
    }

    const parsed = pageSchema.partial().safeParse(rest);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.page.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json(
        { error: "הדף לא נמצא" },
        { status: 404 },
      );
    }

    const page = await prisma.page.update({
      where: { slug },
      data: parsed.data,
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("PUT /api/pages error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון הדף" },
      { status: 500 },
    );
  }
}
