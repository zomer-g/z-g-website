// Shared authorization helpers for the /timeline/* feature.
//
// Intentional mirror of whatsapp-auth.ts: same rules, different DB
// tables. Kept as two separate files (instead of one polymorphic
// helper) because the parallel structure is clearer at read time and
// the two access-control checks have to stay in lock-step anyway.
//
// Rules:
//   - ADMIN role — always allowed.
//   - Other authenticated user — allowed iff there's a
//     TimelineProjectAccess row for their lowercased email.
//   - Anonymous / no session — never allowed.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionAccess,
  type SessionAccess,
} from "@/lib/whatsapp-auth";

// Re-export so callers can import a single name. The shape is
// authentication-domain — not whatsapp-specific — even though it lives
// in whatsapp-auth.ts.
export type { SessionAccess };
export { getSessionAccess };

/** Returns true if the session can read timeline project `projectId`. */
export async function canAccessProject(
  projectId: string,
  access: SessionAccess,
): Promise<boolean> {
  if (access.isAdmin) return true;
  if (!access.email) return false;
  const row = await prisma.timelineProjectAccess.findUnique({
    where: { projectId_email: { projectId, email: access.email } },
    select: { id: true },
  });
  return !!row;
}

export type ProjectGateResult =
  | {
      response?: never;
      project: { id: string; slug: string; title: string };
      access: SessionAccess;
    }
  | { response: NextResponse };

/**
 * Project-level API guard. Mirrors requireWorkspaceAccess from
 * whatsapp-auth.ts. See that file for the status-code rationale
 * (401 / 404 — never leak existence of a project the caller can't see).
 */
export async function requireProjectAccess(
  by: { id?: string; slug?: string },
  opts: { adminOnly?: boolean } = {},
): Promise<ProjectGateResult> {
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
        { error: "מזהה פרויקט חסר" },
        { status: 400 },
      ),
    };
  }
  const project = await prisma.timelineProject.findUnique({
    where,
    select: { id: true, slug: true, title: true },
  });
  if (!project) {
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  if (!access.isAdmin) {
    const allowed = await canAccessProject(project.id, access);
    if (!allowed) {
      return {
        response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
      };
    }
  }
  return { project, access };
}

/** Layer-level guard — resolves layer → project, checks access. */
export async function requireLayerAccess(
  layerId: string,
): Promise<ProjectGateResult & { layerId?: string }> {
  const access = await getSessionAccess();
  if (!access.role) {
    return {
      response: NextResponse.json(
        { error: "נדרשת הזדהות" },
        { status: 401 },
      ),
    };
  }
  const layer = await prisma.timelineLayer.findUnique({
    where: { id: layerId },
    select: {
      id: true,
      project: { select: { id: true, slug: true, title: true } },
    },
  });
  if (!layer) {
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  if (!access.isAdmin) {
    const allowed = await canAccessProject(layer.project.id, access);
    if (!allowed) {
      return {
        response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
      };
    }
  }
  return { project: layer.project, access, layerId: layer.id };
}

/** Same, starting from an event id (event → layer → project). */
export async function requireEventAccess(
  eventId: string,
): Promise<ProjectGateResult & { eventId?: string; layerId?: string }> {
  const access = await getSessionAccess();
  if (!access.role) {
    return {
      response: NextResponse.json(
        { error: "נדרשת הזדהות" },
        { status: 401 },
      ),
    };
  }
  const event = await prisma.timelineEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      layer: {
        select: {
          id: true,
          project: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });
  if (!event) {
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  if (!access.isAdmin) {
    const allowed = await canAccessProject(event.layer.project.id, access);
    if (!allowed) {
      return {
        response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
      };
    }
  }
  return {
    project: event.layer.project,
    access,
    layerId: event.layer.id,
    eventId: event.id,
  };
}

/**
 * Media-level guard: resolves media → layer → project, checks access,
 * then loads the bytes only if access was granted. The two-step lookup
 * avoids reading multi-MB blobs into memory for requests that will
 * 401/404 anyway.
 */
export async function requireTimelineMediaAccess(
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
  const meta = await prisma.timelineMedia.findUnique({
    where: { id: mediaId },
    select: { layer: { select: { projectId: true } } },
  });
  if (!meta) {
    return {
      response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
    };
  }
  if (!access.isAdmin) {
    const allowed = await canAccessProject(meta.layer.projectId, access);
    if (!allowed) {
      return {
        response: NextResponse.json({ error: "לא נמצא" }, { status: 404 }),
      };
    }
  }
  const full = await prisma.timelineMedia.findUnique({
    where: { id: mediaId },
    select: { id: true, filename: true, mimeType: true, size: true, data: true },
  });
  if (!full) {
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

/** Bare admin check for routes that don't take a project id. */
export async function requireAdminOnly() {
  const access = await getSessionAccess();
  if (access.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  return null;
}
