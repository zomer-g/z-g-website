// /api/timeline/projects/[id] — GET (admin or allowlisted) / PATCH+DELETE (admin)
// Mirrors /api/whatsapp/workspaces/[id].

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly, requireProjectAccess } from "@/lib/timeline-auth";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const gate = await requireProjectAccess({ id });
  if ("response" in gate) return gate.response;

  const full = await prisma.timelineProject.findUnique({
    where: { id: gate.project.id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      access: gate.access.isAdmin
        ? {
            select: { id: true, email: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          }
        : false,
      layers: {
        select: {
          id: true,
          title: true,
          description: true,
          selfActor: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { events: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Admin-only enrichment: per-layer distinct actor list + counts, so the
  // admin UI can offer a "who's me?" dropdown without a second roundtrip.
  let layersWithActors = full?.layers ?? [];
  if (full && gate.access.isAdmin) {
    // TimelineEvent has no `isSystem` column (system events are a
    // WhatsApp-export-specific concept); the filter would be invalid.
    // We just exclude empty actors so the dropdown stays useful.
    const grouped = await prisma.timelineEvent.groupBy({
      by: ["layerId", "actor"],
      where: {
        layerId: { in: full.layers.map((l) => l.id) },
        NOT: { actor: "" },
      },
      _count: { _all: true },
    });
    const byLayer = new Map<string, { actor: string; count: number }[]>();
    for (const g of grouped) {
      const arr = byLayer.get(g.layerId) ?? [];
      arr.push({ actor: g.actor, count: g._count._all });
      byLayer.set(g.layerId, arr);
    }
    layersWithActors = full.layers.map((l) => ({
      ...l,
      actors: (byLayer.get(l.id) ?? []).sort((a, b) => b.count - a.count),
    }));
  }

  return NextResponse.json({
    project: full ? { ...full, layers: layersWithActors } : null,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id } = await ctx.params;
  let body: { title?: unknown; description?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const data: { title?: string; description?: string | null } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string" || body.description === null) {
    data.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }
  try {
    const project = await prisma.timelineProject.update({
      where: { id },
      data,
      select: { id: true, slug: true, title: true, description: true },
    });
    return NextResponse.json({ project });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    console.error("patch timeline project failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id } = await ctx.params;
  try {
    await prisma.timelineProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    console.error("delete timeline project failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
