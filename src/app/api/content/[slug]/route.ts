import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CONTENT_DEFAULTS } from "@/lib/content-defaults";

/* ─── Page title labels ─── */

const PAGE_TITLES: Record<string, string> = {
  home: "דף הבית",
  about: "אודות",
  contact: "צור קשר",
  header: "כותרת עליונה",
  footer: "כותרת תחתונה",
};

/* ─── Helper: ensure page exists (auto-creates from defaults) ─── */

async function ensurePageExists(slug: string) {
  let page = await prisma.page.findUnique({ where: { slug } });

  if (!page && CONTENT_DEFAULTS[slug]) {
    // Auto-create the page with default content
    page = await prisma.page.create({
      data: {
        slug,
        title: PAGE_TITLES[slug] ?? slug,
        content: CONTENT_DEFAULTS[slug] as any,
        draftContent: CONTENT_DEFAULTS[slug] as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }

  return page;
}

/* ── GET /api/content/[slug] ── */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const isDraft = req.nextUrl.searchParams.get("draft") === "true";

    const page = await ensurePageExists(slug);

    if (!page) {
      return NextResponse.json(
        { error: "הדף לא נמצא" },
        { status: 404 }
      );
    }

    // Draft content requires admin auth
    if (isDraft) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "נדרשת הזדהות" },
          { status: 401 }
        );
      }
      return NextResponse.json({
        content: page.draftContent ?? page.content,
        status: page.status,
        publishedAt: page.publishedAt,
        updatedAt: page.updatedAt,
        title: page.title,
      });
    }

    return NextResponse.json({
      content: page.content,
      status: page.status,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
      title: page.title,
    });
  } catch (error) {
    console.error("GET /api/content/[slug] error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת התוכן" },
      { status: 500 }
    );
  }
}

/* ── PUT /api/content/[slug] — Save Draft ── */

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const body = await req.json();

    if (!body.content || typeof body.content !== "object") {
      return NextResponse.json(
        { error: "תוכן לא תקין" },
        { status: 400 }
      );
    }

    // Auto-create if doesn't exist
    await ensurePageExists(slug);

    const page = await prisma.page.update({
      where: { slug },
      data: {
        draftContent: body.content,
        status: "DRAFT",
      },
    });

    return NextResponse.json({
      message: "הטיוטה נשמרה בהצלחה",
      status: page.status,
      updatedAt: page.updatedAt,
    });
  } catch (error) {
    console.error("PUT /api/content/[slug] error:", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת הטיוטה" },
      { status: 500 }
    );
  }
}
