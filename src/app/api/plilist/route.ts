import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { plilistPostSchema } from "@/lib/validations";
import { PostStatus } from "@/generated/prisma/client";

/* ---- GET /api/plilist ---- */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") as PostStatus | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const skip = (page - 1) * limit;

    // Unauthenticated requests can only see published posts
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";
    const where = isAdmin
      ? (status ? { status } : {})
      : { status: "PUBLISHED" as PostStatus };

    const [posts, total] = await Promise.all([
      prisma.plilistPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.plilistPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/plilist error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הפוסטים" },
      { status: 500 },
    );
  }
}

/* ---- POST /api/plilist ---- */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = plilistPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { tags, ...rest } = parsed.data;

    const post = await prisma.plilistPost.create({
      data: {
        ...rest,
        tags,
        authorId: session.user.id,
        publishedAt: rest.status === "PUBLISHED" ? new Date() : null,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST /api/plilist error:", error);

    // Handle unique constraint violation (duplicate slug)
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
      { error: "שגיאה ביצירת הפוסט" },
      { status: 500 },
    );
  }
}
