import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { postSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

/* ---- GET /api/posts/[id] ---- */

export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "המאמר לא נמצא" },
        { status: 404 },
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("GET /api/posts/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת המאמר" },
      { status: 500 },
    );
  }
}

/* ---- PUT /api/posts/[id] ---- */

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

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "המאמר לא נמצא" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = postSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Set publishedAt when transitioning to PUBLISHED
    const publishedAt =
      data.status === "PUBLISHED" && existing.status !== "PUBLISHED"
        ? new Date()
        : data.status && data.status !== "PUBLISHED"
          ? null
          : undefined;

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...data,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("PUT /api/posts/[id] error:", error);

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
      { error: "שגיאה בעדכון המאמר" },
      { status: 500 },
    );
  }
}

/* ---- DELETE /api/posts/[id] ---- */

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

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "המאמר לא נמצא" },
        { status: 404 },
      );
    }

    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ message: "המאמר נמחק בהצלחה" });
  } catch (error) {
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת המאמר" },
      { status: 500 },
    );
  }
}
