import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { readJsonBody } from "@/lib/request-body";

/** Ported from pach-hamishpat/server/routes/comments.js. */

// A comment is a short public note; anything longer than this is abuse, not a
// comment. Kept well under the 64KB body cap so the field limit bites first.
const MAX_COMMENT_LENGTH = 2000;

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

  // Only admins may read moderated (hidden) comments. Anonymous/guest
  // callers are always constrained to visible rows, regardless of the
  // is_hidden query param — otherwise ?is_hidden=true leaks moderated content.
  const isAdmin = (await auth())?.user?.role === "ADMIN";
  const where: Record<string, unknown> = {};
  if (!isAdmin) {
    where.isHidden = false;
  } else if (isHiddenRaw !== null) {
    where.isHidden = isHiddenRaw === "true" || isHiddenRaw === "1";
  }

  const desc = sortRaw.startsWith("-");
  const col = desc ? sortRaw.slice(1) : sortRaw;
  const sortKey = col === "id" ? "id" : "createdDate";
  const orderBy = { [sortKey]: desc ? "desc" : "asc" } as const;

  const limit = limitRaw ? Math.min(500, Math.max(1, Number(limitRaw) || 50)) : 50;

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
    // Public, unauthenticated endpoint — throttle per IP to prevent flooding.
    const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
    const limited = rateLimit(`pach-comments:${getClientIp(req)}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const parsedBody = await readJsonBody<Record<string, unknown>>(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: "התגובה ארוכה מדי" }, { status: 400 });
    }
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

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
