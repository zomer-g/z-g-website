import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CONTENT_DEFAULTS } from "@/lib/content-defaults";

const PAGE_TITLES: Record<string, string> = {
  home: "דף הבית",
  about: "אודות",
  contact: "צור קשר",
  header: "כותרת עליונה",
  footer: "כותרת תחתונה",
};

/* ── POST /api/content/[slug]/publish ── */

export async function POST(
  _req: Request,
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

    let existing = await prisma.page.findUnique({
      where: { slug },
      select: { draftContent: true, content: true },
    });

    // Auto-create if doesn't exist
    if (!existing && CONTENT_DEFAULTS[slug]) {
      await prisma.page.create({
        data: {
          slug,
          title: PAGE_TITLES[slug] ?? slug,
          content: CONTENT_DEFAULTS[slug] as any,
          draftContent: CONTENT_DEFAULTS[slug] as any,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
      existing = {
        draftContent: CONTENT_DEFAULTS[slug] as any,
        content: CONTENT_DEFAULTS[slug] as any,
      };
    }

    if (!existing) {
      return NextResponse.json(
        { error: "הדף לא נמצא" },
        { status: 404 }
      );
    }

    // Use draft content if available, otherwise keep current content
    const contentToPublish = existing.draftContent ?? existing.content;

    const page = await prisma.page.update({
      where: { slug },
      data: {
        content: contentToPublish as any,
        draftContent: contentToPublish as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "התוכן פורסם בהצלחה",
      status: page.status,
      publishedAt: page.publishedAt,
    });
  } catch (error) {
    console.error("POST /api/content/[slug]/publish error:", error);
    return NextResponse.json(
      { error: "שגיאה בפרסום התוכן" },
      { status: 500 }
    );
  }
}
