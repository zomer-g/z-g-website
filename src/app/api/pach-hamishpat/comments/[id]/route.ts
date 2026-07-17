import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** Admin-only PATCH for comments. */

const FIELD_MAP: Record<string, string> = {
  content: "content",
  author_name: "authorName",
  is_admin: "isAdmin",
  is_hidden: "isHidden",
};

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
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
    if (col === "isHidden" || col === "isAdmin") data[col] = !!v;
    else data[col] = v;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.pachComment.update({ where: { id }, data });
    return NextResponse.json(serialize(updated));
  } catch (e) {
    console.error("PATCH /api/pach-hamishpat/comments/[id]", e);
    return NextResponse.json({ error: "שגיאה בעדכון תגובה" }, { status: 500 });
  }
}
