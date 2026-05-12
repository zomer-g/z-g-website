import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** Admin-only PATCH for system messages. */

const FIELD_MAP: Record<string, string> = {
  title: "title",
  content: "content",
  image_url: "imageUrl",
  order_index: "orderIndex",
  is_archived: "isArchived",
};

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    const col = FIELD_MAP[k];
    if (!col) continue;
    if (col === "isArchived") data[col] = !!v;
    else if (col === "orderIndex") data[col] = Number.isFinite(Number(v)) ? Number(v) : 0;
    else data[col] = v;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.pachSystemMessage.update({ where: { id }, data });
    return NextResponse.json(serialize(updated));
  } catch (e) {
    console.error("PATCH /api/pach-hamishpat/messages/[id]", e);
    return NextResponse.json({ error: "שגיאה בעדכון הודעה" }, { status: 500 });
  }
}
