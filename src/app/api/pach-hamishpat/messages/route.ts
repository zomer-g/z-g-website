import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** Ported from pach-hamishpat/server/routes/system-messages.js. */

function serialize(m: {
  id: number;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isArchived: boolean;
  createdDate: Date;
}) {
  return {
    id: m.id,
    title: m.title,
    content: m.content,
    image_url: m.imageUrl,
    order_index: m.orderIndex,
    is_archived: m.isArchived,
    created_date: m.createdDate.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const isArchivedRaw = sp.get("is_archived");
  const limitRaw = sp.get("limit");
  const sortRaw = sp.get("sort") || "order_index";

  const where: Record<string, unknown> = {};
  if (isArchivedRaw !== null) {
    where.isArchived = isArchivedRaw === "true" || isArchivedRaw === "1";
  }

  const desc = sortRaw.startsWith("-");
  const col = desc ? sortRaw.slice(1) : sortRaw;
  const sortKey =
    col === "created_date" ? "createdDate" : col === "id" ? "id" : "orderIndex";
  const orderBy = { [sortKey]: desc ? "desc" : "asc" } as const;

  const limit = limitRaw ? Math.min(500, Math.max(1, Number(limitRaw) || 100)) : 500;

  try {
    const rows = await prisma.pachSystemMessage.findMany({ where, orderBy, take: limit });
    return NextResponse.json(rows.map(serialize));
  } catch (e) {
    console.error("GET /api/pach-hamishpat/messages", e);
    return NextResponse.json({ error: "שגיאה בטעינת הודעות מערכת" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    // Optional explicit backdating — lets the admin enter historical
    // messages with their original publication date.
    let createdDate: Date | undefined;
    if (typeof body.created_date === "string" && body.created_date) {
      const d = new Date(body.created_date);
      if (!Number.isNaN(d.getTime())) createdDate = d;
    }
    const created = await prisma.pachSystemMessage.create({
      data: {
        title: typeof body.title === "string" ? body.title : null,
        content: typeof body.content === "string" ? body.content : null,
        imageUrl: typeof body.image_url === "string" ? body.image_url : null,
        orderIndex: Number.isFinite(Number(body.order_index)) ? Number(body.order_index) : 0,
        isArchived: false,
        ...(createdDate ? { createdDate } : {}),
      },
    });
    return NextResponse.json(serialize(created));
  } catch (e) {
    console.error("POST /api/pach-hamishpat/messages", e);
    return NextResponse.json({ error: "שגיאה ביצירת הודעה" }, { status: 500 });
  }
}
