import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { submissionSchema } from "@/lib/validations";

/* ---- GET /api/submissions ---- */

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const { searchParams } = req.nextUrl;
    const isReadParam = searchParams.get("isRead");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const skip = (page - 1) * limit;

    const where =
      isReadParam !== null ? { isRead: isReadParam === "true" } : {};

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/submissions error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הפניות" },
      { status: 500 },
    );
  }
}

/* ---- POST /api/submissions (Public) ---- */

export async function POST(req: NextRequest) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
    const limited = rateLimit(`submissions:${getClientIp(req)}`, { limit: 5, windowMs: 60_000 });
    if (limited) return limited;

    const body = await req.json();
    const parsed = submissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const submission = await prisma.submission.create({
      data: parsed.data,
    });

    return NextResponse.json(
      { message: "הפנייה נשלחה בהצלחה", id: submission.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/submissions error:", error);
    return NextResponse.json(
      { error: "שגיאה בשליחת הפנייה. נסו שוב מאוחר יותר." },
      { status: 500 },
    );
  }
}
