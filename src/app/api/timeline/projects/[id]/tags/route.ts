// /api/timeline/projects/[id]/tags — twin of /api/whatsapp/workspaces/[id]/tags.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/timeline-auth";
import { validateTagPayload } from "@/lib/tags-helpers";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const gate = await requireProjectAccess({ id });
  if ("response" in gate) return gate.response;

  const tags = await prisma.timelineTag.findMany({
    where: { projectId: id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ tags });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const gate = await requireProjectAccess({ id }, { adminOnly: true });
  if ("response" in gate) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const parsed = validateTagPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    const tag = await prisma.timelineTag.create({
      data: {
        projectId: gate.project.id,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
      },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : null;
    if (code === "P2002") {
      return NextResponse.json({ error: "תגית עם השם הזה כבר קיימת" }, { status: 409 });
    }
    console.error("create timeline tag failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
