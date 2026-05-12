import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** Ported from pach-hamishpat/server/routes/comments.js. */

function serialize(c: {
  id: number;
  content: string;
  authorName: string;
  isAdmin: boolean;
  isHidden: boolean;
  createdDate: Date;
}) {
  return {
    id: c.id,
    content: c.content,
    author_name: c.authorName,
    is_admin: c.isAdmin,
    is_hidden: c.isHidden,
    created_date: c.createdDate.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const isHiddenRaw = sp.get("is_hidden");
  const limitRaw = sp.get("limit");
  const sortRaw = sp.get("sort") || "-created_date";

  const where: Record<string, unknown> = {};
  if (isHiddenRaw !== null) {
    where.isHidden = isHiddenRaw === "true" || isHiddenRaw === "1";
  }

  const desc = sortRaw.startsWith("-");
  const col = desc ? sortRaw.slice(1) : sortRaw;
  const sortKey = col === "id" ? "id" : "createdDate";
  const orderBy = { [sortKey]: desc ? "desc" : "asc" } as const;

  const limit = limitRaw ? Math.min(500, Math.max(1, Number(limitRaw) || 50)) : 500;

  try {
    const rows = await prisma.pachComment.findMany({ where, orderBy, take: limit });
    return NextResponse.json(rows.map(serialize));
  } catch (e) {
    console.error("GET /api/pach-hamishpat/comments", e);
    return NextResponse.json({ error: "שגיאה בטעינת תגובות" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }
    const session = await auth();
    const isAdmin = !!session?.user;

    const created = await prisma.pachComment.create({
      data: {
        content,
        authorName:
          typeof body.author_name === "string" && body.author_name.trim()
            ? body.author_name.trim().slice(0, 100)
            : "אנונימי",
        // Trust admin status from the session.
        isAdmin,
        isHidden: false,
      },
    });
    return NextResponse.json(serialize(created));
  } catch (e) {
    console.error("POST /api/pach-hamishpat/comments", e);
    return NextResponse.json({ error: "שגיאה ביצירת תגובה" }, { status: 500 });
  }
}
