import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { caseDocumentSchema } from "@/lib/validations";
import { getPrivateFiles, uploadNameFromPath } from "@/lib/private-files";

/* ---- GET /api/case-documents?caseTag=&category= ---- */

export async function GET(req: NextRequest) {
  try {
    const caseTag = req.nextUrl.searchParams.get("caseTag");
    const category = req.nextUrl.searchParams.get("category");

    const isAdmin = (await auth())?.user?.role === "ADMIN";
    const documents = await prisma.caseDocument.findMany({
      where: {
        ...(caseTag ? { caseTag } : {}),
        ...(category ? { category } : {}),
        // Inactive documents are hidden from the public case files.
        ...(isAdmin ? {} : { isActive: true }),
      },
      orderBy: [{ caseTag: "asc" }, { category: "asc" }, { order: "asc" }],
    });
    if (isAdmin) return NextResponse.json(documents);

    // Nor does the public list name a file an admin marked private.
    const hidden = await getPrivateFiles();
    return NextResponse.json(
      documents.filter((d) => {
        const name = d.fileUrl ? uploadNameFromPath(d.fileUrl.replace(/^https?:\/\/[^/]+/, "")) : null;
        return !name || !hidden.has(name);
      }),
    );
  } catch (error) {
    console.error("GET /api/case-documents error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת מסמכי התיק" },
      { status: 500 },
    );
  }
}

/* ---- POST /api/case-documents ---- */

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
    const parsed = caseDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const document = await prisma.caseDocument.create({ data: parsed.data });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("POST /api/case-documents error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת מסמך התיק" },
      { status: 500 },
    );
  }
}
