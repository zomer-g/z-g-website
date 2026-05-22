// /api/timeline/events/[id] — ADMIN PATCH (edit / hide / unhide) + DELETE.
//
// Lives at /api/timeline/events/[id] (not nested under layers) so the
// shell's generic toggleHidden URL builder mirrors the whatsapp one
// (/api/whatsapp/messages/[id]). Path symmetry > path nesting.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";

const KNOWN_CATEGORIES = new Set(["action", "search", "message", "meeting", "note"]);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id } = await ctx.params;
  let body: {
    isHidden?: unknown;
    timestamp?: unknown;
    actor?: unknown;
    category?: unknown;
    title?: unknown;
    body?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const data: {
    isHidden?: boolean;
    timestamp?: Date;
    actor?: string;
    category?: string;
    title?: string | null;
    body?: string | null;
  } = {};

  if (typeof body.isHidden === "boolean") data.isHidden = body.isHidden;
  if (typeof body.timestamp === "string") {
    const t = new Date(body.timestamp);
    if (Number.isNaN(t.getTime())) {
      return NextResponse.json({ error: "timestamp לא תקין" }, { status: 400 });
    }
    data.timestamp = t;
  }
  if (typeof body.actor === "string") {
    const a = body.actor.trim();
    if (!a) {
      return NextResponse.json({ error: "actor לא יכול להיות ריק" }, { status: 400 });
    }
    data.actor = a;
  }
  if (typeof body.category === "string") {
    data.category = KNOWN_CATEGORIES.has(body.category) ? body.category : "note";
  }
  if ("title" in body) {
    data.title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : null;
  }
  if ("body" in body) {
    data.body =
      typeof body.body === "string" && body.body.trim()
        ? body.body.trim()
        : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  try {
    const event = await prisma.timelineEvent.update({
      where: { id },
      data,
      select: {
        id: true,
        timestamp: true,
        actor: true,
        category: true,
        title: true,
        body: true,
        isHidden: true,
      },
    });
    return NextResponse.json({ event });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    console.error("PATCH timeline event failed:", err);
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
    await prisma.timelineEvent.delete({ where: { id } });
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
    console.error("DELETE timeline event failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
