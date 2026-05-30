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

  // Structured-model summary per chapter: number of law clauses and decided
  // examples extracted. Lets the admin verify the structured extraction ran.
  const sections = await prisma.foiLawSection.findMany({
    select: { docId: true, _count: { select: { examples: true } } },
  });
  const sectionCount = new Map<number, number>();
  const exampleCount = new Map<number, number>();
  for (const s of sections) {
    sectionCount.set(s.docId, (sectionCount.get(s.docId) ?? 0) + 1);
    exampleCount.set(s.docId, (exampleCount.get(s.docId) ?? 0) + s._count.examples);
  }

  return NextResponse.json({
    docs: docs.map((d) => ({
      ...d,
      caseLawCount: Array.isArray(d.caseLawJson) ? d.caseLawJson.length : 0,
      sectionCount: sectionCount.get(d.id) ?? 0,
      exampleCount: exampleCount.get(d.id) ?? 0,
      // Don't ship the full footnote JSON to the list view — it can be heavy
      // and the admin page doesn't need it.
      caseLawJson: undefined,
    })),
  });
}
