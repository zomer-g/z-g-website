// Shared authorization helpers for the /whatsapp/* feature.
//
// Both the public-facing workspace pages and every API route under
// /api/whatsapp/* go through one of these helpers so the access rules
// stay in exactly one place. The rules are:
//
//   - ADMIN role (from src/lib/auth.ts) — always allowed everywhere.
//   - Anyone else — allowed only if there's a WhatsappWorkspaceAccess
//     row matching (workspaceId, lowercased(email)).
//   - Anonymous / no session — never allowed to read workspace data.
//
// API handlers should use `requireWorkspaceAccess`, which returns a
// typed Response on failure that they can return directly. Pages should
// use `getSessionAccess` / `canAccessWorkspace` and call notFound() or
// redirect() themselves.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types/next-auth";

export interface SessionAccess {
  email: string | null;     // always lowercased, null when anonymous
  role: AppRole | null;     // null when anonymous
  isAdmin: boolean;
}

export async function getSessionAccess(): Promise<SessionAccess> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  const role = session?.user?.role ?? null;
  return { email, role, isAdmin: role === "ADMIN" };
}

/** Returns true if the session can read workspace `workspaceId`. */
export async function canAccessWorkspace(
  workspaceId: string,
  access: SessionAccess,
): Promise<boolean> {
  if (access.isAdmin) return true;
  if (!access.email) return false;
  const row = await prisma.whatsappWorkspaceAccess.findUnique({
    where: { workspaceId_email: { workspaceId, email: access.email } },
    select: { id: true },
  });
  return !!row;
}

/**
 * API-route guard. Resolves the workspace (by id OR slug), checks access,
 * and returns either `{ workspace, access }` or a ready-to-return
 * NextResponse with the right status code.
 *
 * Usage:
 *   const gate = await requireWorkspaceAccess({ id }, { adminOnly: true });
 *   if ("response" in gate) return gate.response;
 *   const { workspace, access } = gate;
 *
 * Status code policy:
 *   - No session → 401 (so the client can route to login)
 *   - Workspace not found → 404 (don't leak existence)
 *   - Session exists but not allowed → 404 (same, no enumeration)
 *   - adminOnly + session is GUEST → 404
 */
export type WorkspaceGateResult =
  | {
      response?: never;
      workspace: { id: string; slug: string; title: string };
      access: SessionAccess;
    }
  | { response: NextResponse };

export async function requireWorkspaceAccess(
  by: { id?: string; slug?: string },
  opts: { adminOnly?: boolean } = {},
): Promise<WorkspaceGateResult> {
  const access = await getSessionAccess();
  if (!access.role) {
    return {
      response: NextResponse.json(
        { error: "נדרשת הזדהות" },
        { status: 401 },
      ),
    };
  }
  if (opts.adminOnly && !access.isAdmin) {
    return {
      response: NextResponse.json({ error: "אין הרשאה" }, { status: 404 }),
    };
  }
  const where = by.id ? { id: by.id } : by.slug ? { slug: by.slug } : null;
  if (!where) {
    return {
      response: NextResponse.json(
        { error: "מזהה סביבת עבודה חסר" },
        { status: 400 },
      ),
    };
  }
  const workspace = await prisma.whatsappWorkspace.findUnique({
    where,
    select: { id: true, slug: true, title: true },
  });
  if (!workspace) {
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  if (!access.isAdmin) {
    const allowed = await canAccessWorkspace(workspace.id, access);
    if (!allowed) {
      return {
        response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
      };
    }
  }
  return { workspace, access };
}

/**
 * Same as `requireWorkspaceAccess` but resolves the workspace via a chat id
 * — for routes like /api/whatsapp/chats/[chatId]/messages where the URL
 * only carries the chat id and we still want to gate by workspace access.
 */
export async function requireChatAccess(
  chatId: string,
): Promise<WorkspaceGateResult & { chatId?: string }> {
  const access = await getSessionAccess();
  if (!access.role) {
    return {
      response: NextResponse.json(
        { error: "נדרשת הזדהות" },
        { status: 401 },
      ),
    };
  }
  const chat = await prisma.whatsappChat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      workspace: { select: { id: true, slug: true, title: true } },
    },
  });
  if (!chat) {
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  if (!access.isAdmin) {
    const allowed = await canAccessWorkspace(chat.workspace.id, access);
    if (!allowed) {
      return {
        response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
      };
    }
  }
  return { workspace: chat.workspace, access, chatId: chat.id };
}

/** Same, but starting from a media id (resolves media → chat → workspace). */
export async function requireMediaAccess(
  mediaId: string,
): Promise<
  | { response: NextResponse }
  | {
      response?: never;
      access: SessionAccess;
      media: {
        id: string;
        filename: string;
        mimeType: string;
        size: number;
        data: Buffer;
      };
    }
> {
  const access = await getSessionAccess();
  if (!access.role) {
    return {
      response: NextResponse.json(
        { error: "נדרשת הזדהות" },
        { status: 401 },
      ),
    };
  }
  // Two-step lookup: first the lightweight workspaceId via the join, then
  // the actual bytes only after access has been verified. Avoids reading
  // ~MB of `data` into memory for a request that's going to 401/404.
  const meta = await prisma.whatsappMedia.findUnique({
    where: { id: mediaId },
    select: {
      chat: { select: { workspaceId: true } },
    },
  });
  if (!meta) {
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  if (!access.isAdmin) {
    const allowed = await canAccessWorkspace(meta.chat.workspaceId, access);
    if (!allowed) {
      return {
        response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
      };
    }
  }
  const full = await prisma.whatsappMedia.findUnique({
    where: { id: mediaId },
    select: { id: true, filename: true, mimeType: true, size: true, data: true },
  });
  if (!full) {
    // Row deleted between our two reads — treat as not found.
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  return {
    access,
    media: {
      id: full.id,
      filename: full.filename,
      mimeType: full.mimeType,
      size: full.size,
      data: Buffer.from(full.data),
    },
  };
}
