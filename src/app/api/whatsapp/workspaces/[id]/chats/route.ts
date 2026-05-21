// /api/whatsapp/workspaces/[id]/chats — ADMIN-only.
//
// POST → upload a WhatsApp Chat Export ZIP for this workspace. Parses
// it server-side, writes one WhatsappChat row + N WhatsappMessage rows
// + M WhatsappMedia rows in a single transaction.
//
// We deliberately keep the parsed payload (potentially many MB of
// images) entirely in this handler's memory and never on disk. Render
// is ephemeral; the only persistence is the DB.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWhatsappZip } from "@/lib/whatsapp-zip";

// Hard upper bound. WhatsApp typically caps a single chat export at
// ~100MB but exporters can produce larger archives.
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

// Increase the body-size limit explicitly so Next doesn't truncate a
// big multipart upload before our handler runs.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  return null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const ws = await prisma.whatsappWorkspace.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ws) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    console.error("formData parse failed:", err);
    return NextResponse.json(
      { error: "לא ניתן לקרוא את הקובץ שהועלה" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'יש לצרף קובץ ZIP בשם "file"' },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `הקובץ גדול מהמותר (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB)` },
      { status: 413 },
    );
  }
  if (!/\.zip$/i.test(file.name)) {
    return NextResponse.json(
      { error: 'יש להעלות קובץ עם סיומת .zip' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseWhatsappZip(buffer);
  } catch (err) {
    console.error("parseWhatsappZip failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "נכשל ניתוח קובץ ה-ZIP",
      },
      { status: 400 },
    );
  }

  if (parsed.messages.length === 0) {
    return NextResponse.json(
      { error: "לא נמצאו הודעות בקובץ" },
      { status: 400 },
    );
  }

  const firstAt = parsed.messages[0]?.timestamp ?? null;
  const lastAt = parsed.messages[parsed.messages.length - 1]?.timestamp ?? null;

  // One transaction: chat → media (with filename→id map) → messages.
  // If anything fails mid-way nothing lands and we don't leave half a
  // chat in the DB.
  const created = await prisma.$transaction(
    async (tx) => {
      const chat = await tx.whatsappChat.create({
        data: {
          workspaceId: id,
          contactName: parsed.contactName || "ללא שם",
          zipFilename: file.name,
          messageCount: parsed.messages.length,
          firstAt,
          lastAt,
        },
        select: { id: true },
      });

      const mediaByFilename = new Map<string, string>();
      for (const m of parsed.media) {
        const row = await tx.whatsappMedia.create({
          data: {
            chatId: chat.id,
            filename: m.filename,
            mimeType: m.mimeType,
            size: m.size,
            data: m.data,
          },
          select: { id: true },
        });
        mediaByFilename.set(m.filename, row.id);
      }

      await tx.whatsappMessage.createMany({
        data: parsed.messages.map((msg, idx) => ({
          chatId: chat.id,
          timestamp: msg.timestamp,
          sender: msg.sender,
          isSystem: msg.isSystem,
          text: msg.text,
          mediaId: msg.mediaFilename
            ? mediaByFilename.get(msg.mediaFilename) ?? null
            : null,
          order: idx,
        })),
      });

      return chat;
    },
    { timeout: 60_000, maxWait: 5_000 },
  );

  return NextResponse.json(
    {
      chat: {
        id: created.id,
        contactName: parsed.contactName,
        messageCount: parsed.messages.length,
        mediaCount: parsed.media.length,
      },
    },
    { status: 201 },
  );
}
