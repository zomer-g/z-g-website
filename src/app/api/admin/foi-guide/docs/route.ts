import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const docs = await prisma.foiGuideDoc.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      url: true,
      title: true,
      order: true,
      chunkCount: true,
      textChars: true,
      lastFetchedAt: true,
      caseLawJson: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    docs: docs.map((d) => ({
      ...d,
      caseLawCount: Array.isArray(d.caseLawJson) ? d.caseLawJson.length : 0,
      // Don't ship the full footnote JSON to the list view — it can be heavy
      // and the admin page doesn't need it. The /api/foi-guide/doc/[slug]
      // endpoint can return it on demand if we ever build a doc-detail page.
      caseLawJson: undefined,
    })),
  });
}
