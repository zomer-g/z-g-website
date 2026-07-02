import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DICTIONARY_HEADER_DEFAULTS,
  DICTIONARY_HEADER_SLUG,
  type DictionaryHeader,
} from "@/app/dictionary/header-defaults";

/** Read the stored dictionary header, falling back to defaults. */
async function loadHeader(): Promise<DictionaryHeader> {
  try {
    const page = await prisma.page.findUnique({
      where: { slug: DICTIONARY_HEADER_SLUG },
      select: { content: true },
    });
    const c = (page?.content ?? {}) as Partial<DictionaryHeader>;
    return {
      title: c.title?.trim() || DICTIONARY_HEADER_DEFAULTS.title,
      subtitle: c.subtitle?.trim() || DICTIONARY_HEADER_DEFAULTS.subtitle,
    };
  } catch {
    return DICTIONARY_HEADER_DEFAULTS;
  }
}

export async function GET() {
  return NextResponse.json({ header: await loadHeader() });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

  try {
    const body = await req.json();
    const header: DictionaryHeader = {
      title: String(body.title ?? "").trim() || DICTIONARY_HEADER_DEFAULTS.title,
      subtitle:
        String(body.subtitle ?? "").trim() || DICTIONARY_HEADER_DEFAULTS.subtitle,
    };

    const content: Record<string, string> = { ...header };

    await prisma.page.upsert({
      where: { slug: DICTIONARY_HEADER_SLUG },
      create: {
        slug: DICTIONARY_HEADER_SLUG,
        title: "מילון — כותרת העמוד",
        content,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      update: { content },
    });

    return NextResponse.json({ header });
  } catch {
    return NextResponse.json({ error: "שגיאה בשמירה" }, { status: 500 });
  }
}
