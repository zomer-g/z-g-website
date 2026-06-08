import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { WhatsappShell } from "@/components/conversation/conversation-shell";
import { prisma } from "@/lib/prisma";
import { getSessionAccess, canAccessWorkspace } from "@/lib/whatsapp-auth";
import type { WhatsappWorkspaceDTO } from "@/components/conversation/types";

export const dynamic = "force-dynamic";

// Defense-in-depth: even if a slug leaks externally, search engines must
// not crawl it. The robots.ts file ALSO disallows /whatsapp/.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "אזור עבודה — ווטסאפ",
};

interface PageProps {
  params: Promise<{ slug: string }>;
  // ?view=clean (or ?view=0 / ?view=embed) renders the workspace shell
  // without the site header/footer/admin bar — useful when sharing the
  // workspace as a standalone window or embedding inside something else.
  searchParams: Promise<{ view?: string | string[] }>;
}

// Treats any of these query values as "clean view" so the operator can
// pick whichever feels natural in the share link.
const CLEAN_VIEW_VALUES = new Set(["clean", "0", "embed", "raw"]);

function isCleanView(sp: { view?: string | string[] }): boolean {
  const v = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  return typeof v === "string" && CLEAN_VIEW_VALUES.has(v.toLowerCase());
}

export default async function WhatsappWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const cleanView = isCleanView(sp);

  // Resolve the workspace first. We can't 401 unauthenticated users
  // here (they'd see a bare error) — bounce them through the login
  // flow with a callbackUrl so they end up back at this exact slug.
  const workspace = await prisma.whatsappWorkspace.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      chats: {
        select: {
          id: true,
          contactName: true,
          // Per-chat "self" sender — admin sets this from /admin/whatsapp/[id].
          // When null, no message is treated as outgoing (everything reads as
          // incoming/white).
          selfSender: true,
          messageCount: true,
          lastAt: true,
        },
        orderBy: [{ lastAt: "desc" }, { uploadedAt: "desc" }],
      },
    },
  });
  if (!workspace) notFound();

  const access = await getSessionAccess();
  if (!access.role) {
    // Anonymous — go through login. Preserve the ?view=clean param on
    // the callback so the user lands back in clean view after sign-in.
    const target = cleanView
      ? `/whatsapp/${slug}?view=clean`
      : `/whatsapp/${slug}`;
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  const allowed = await canAccessWorkspace(workspace.id, access);
  if (!allowed) {
    // Logged in but no rights — 404 so we don't leak the workspace's
    // existence to a curious authenticated guest.
    notFound();
  }

  const dto: WhatsappWorkspaceDTO = {
    id: workspace.id,
    title: workspace.title,
    // Workspace-level fallback used by the shell only when a chat has no
    // per-chat selfSender set. The per-chat value (configured by the
    // admin in /admin/whatsapp/[id]) is the real signal — see below.
    selfSender: "",
    chats: workspace.chats.map((c) => ({
      id: c.id,
      contactName: c.contactName,
      selfSender: c.selfSender ?? null,
      messageCount: c.messageCount,
      lastAt: c.lastAt ? c.lastAt.toISOString() : null,
      lastTextPreview: null,
    })),
  };

  // Clean view: no PublicLayout (so no site header/footer/admin bar),
  // no wrapper chrome — the shell fills the entire viewport. Designed
  // for sharing a single workspace as a standalone window or embedding
  // it inside another page (iframe). The auth gate above still runs.
  if (cleanView) {
    return (
      // h-screen (not min-h-screen) so the shell can scroll internally
      // — without a fixed height, ChatPane's overflow-y-auto wouldn't
      // have a constraint to bound it. w-screen would introduce a
      // horizontal scrollbar; rely on the body's full width instead.
      <div dir="rtl" className="flex h-screen flex-col bg-[#dadbd3]">
        <WhatsappShell workspace={dto} mode="live" isAdmin={access.isAdmin} />
      </div>
    );
  }

  return (
    <PublicLayout>
      <Container className="py-4">
        <div dir="rtl" className="space-y-3">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-primary-dark truncate">
              {workspace.title}
            </h1>
            <span className="text-xs text-gray-500">
              {workspace.chats.length} שיחות
            </span>
          </header>

          <div
            className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
            // Fill the viewport below the site header + this page's compact
            // title row, so the whole interface fits one screen with no
            // page scroll (only the message list scrolls internally).
            style={{ height: "calc(100dvh - 160px)", minHeight: "420px" }}
          >
            <div className="flex h-full min-h-0">
              <WhatsappShell workspace={dto} mode="live" isAdmin={access.isAdmin} />
            </div>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
