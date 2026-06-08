// /api/timeline/projects/[id]/search?q=...&tag=...&tag=...
// Twin of /api/whatsapp/workspaces/[id]/search.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/timeline-auth";

const MAX_LIMIT = 1000;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const gate = await requireProjectAccess({ id });
  if ("response" in gate) return gate.response;

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const tagIds = sp.getAll("tag").filter(Boolean);
  if (!q && tagIds.length === 0) {
    return NextResponse.json({ items: [], total: 0 });
  }
  const limit = Math.min(MAX_LIMIT, Number(sp.get("limit")) || 500);

  const baseWhere = {
    layer: { projectId: gate.project.id },
    ...(gate.access.isAdmin ? {} : { isHidden: false }),
  };
  const andClauses: object[] = [baseWhere];
  if (q) {
    andClauses.push({
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { body: { contains: q, mode: "insensitive" as const } },
        { actor: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }
  if (tagIds.length > 0) {
    andClauses.push({ tags: { some: { tagId: { in: tagIds } } } });
  }

  const events = await prisma.timelineEvent.findMany({
    where: { AND: andClauses },
    orderBy: { timestamp: "asc" },
    take: limit,
    select: {
      id: true,
      timestamp: true,
      actor: true,
      category: true,
      title: true,
      body: true,
      isHidden: true,
      isStarred: true,
      media: {
        select: { id: true, filename: true, mimeType: true, size: true },
      },
      layer: { select: { id: true, title: true, selfActor: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  });

  return NextResponse.json(
    {
      total: events.length,
      isAdmin: gate.access.isAdmin,
      items: events.map((e) => ({
        id: e.id,
        timestamp: e.timestamp.toISOString(),
        sender: e.actor,
        actor: e.actor,
        category: e.category,
        title: e.title,
        isSystem: false,
        isHidden: gate.access.isAdmin ? e.isHidden : false,
        isStarred: gate.access.isAdmin ? e.isStarred : false,
        text: e.body,
        media: e.media,
        sourceChannelId: e.layer.id,
        sourceContact: e.layer.title,
        sourceSelfSender: e.layer.selfActor,
        tags: e.tags.map((t) => t.tag),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
