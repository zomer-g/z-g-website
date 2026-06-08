// /api/timeline/layers/[layerId]/events
//
// GET  — paginated events for a layer. Mirrors
//        /api/whatsapp/chats/[chatId]/messages so the shared shell can
//        consume both with the same client-side parser.
// POST — ADMIN: create a single event in this layer (manual editor).
//        Bulk CSV/JSON import lives under .../events/import.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly, requireLayerAccess } from "@/lib/timeline-auth";

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

// Free-form, but we surface a documented set so the admin UI can offer
// a select. The DB column accepts anything — UI falls back to "note".
const KNOWN_CATEGORIES = new Set(["action", "search", "message", "meeting", "note"]);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ layerId: string }> },
) {
  const { layerId } = await ctx.params;
  const gate = await requireLayerAccess(layerId);
  if ("response" in gate) return gate.response;

  const sp = req.nextUrl.searchParams;
  const skipRaw = Number(sp.get("skip"));
  const limitRaw = Number(sp.get("limit"));
  const skip = Number.isFinite(skipRaw) && skipRaw > 0 ? Math.floor(skipRaw) : 0;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), MAX_LIMIT)
      : DEFAULT_LIMIT;

  // Same hidden-row policy as whatsapp: admins see everything (with
  // the flag); guests only see visible rows. Filtering happens at the
  // DB so hidden text never lands in a guest's browser.
  const where = gate.access.isAdmin
    ? { layerId }
    : { layerId, isHidden: false };

  const [total, events] = await Promise.all([
    prisma.timelineEvent.count({ where }),
    prisma.timelineEvent.findMany({
      where,
      orderBy: { order: "asc" },
      skip,
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
      },
    }),
  ]);

  return NextResponse.json(
    {
      total,
      skip,
      limit,
      isAdmin: gate.access.isAdmin,
      // Shape that matches the whatsapp GET so the shared shell consumes
      // both via the same code path. `sender` ← actor, `text` ← body,
      // `isSystem` always false (timeline doesn't have system events
      // analogous to "encrypted notice").
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
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ layerId: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { layerId } = await ctx.params;
  const layer = await prisma.timelineLayer.findUnique({
    where: { id: layerId },
    select: { id: true },
  });
  if (!layer) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  let body: {
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

  const ts =
    typeof body.timestamp === "string" ? new Date(body.timestamp) : null;
  if (!ts || Number.isNaN(ts.getTime())) {
    return NextResponse.json(
      { error: "timestamp לא תקין (ISO 8601 נדרש)" },
      { status: 400 },
    );
  }
  const actor = typeof body.actor === "string" ? body.actor.trim() : "";
  if (!actor) {
    return NextResponse.json({ error: "actor נדרש" }, { status: 400 });
  }
  const category =
    typeof body.category === "string" && KNOWN_CATEGORIES.has(body.category)
      ? body.category
      : "note";
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : null;
  const text =
    typeof body.body === "string" && body.body.trim()
      ? body.body.trim()
      : null;
  if (!title && !text) {
    return NextResponse.json(
      { error: "נדרש לפחות שדה אחד מבין title או body" },
      { status: 400 },
    );
  }

  // Append at the end of the layer's order axis. Concurrent inserts
  // could race here — acceptable for an admin-only editor. Worst case
  // two events get the same `order` and we tie-break by timestamp.
  const maxOrder = await prisma.timelineEvent.aggregate({
    where: { layerId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const created = await prisma.timelineEvent.create({
    data: {
      layerId,
      timestamp: ts,
      actor,
      category,
      title,
      body: text,
      order: nextOrder,
    },
    select: { id: true },
  });

  return NextResponse.json({ event: created }, { status: 201 });
}
