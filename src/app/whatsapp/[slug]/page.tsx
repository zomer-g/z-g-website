import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { WhatsappShell } from "@/components/whatsapp/whatsapp-shell";
import { prisma } from "@/lib/prisma";
import { getSessionAccess, canAccessWorkspace } from "@/lib/whatsapp-auth";
import type { WhatsappWorkspaceDTO } from "@/components/whatsapp/types";

export const dynamic = "force-dynamic";

// Defense-in-depth: even if a slug leaks externally, search engines must
// not crawl it. The robots.ts file ALSO disallows /whatsapp/.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "אזור עבודה — ווטסאפ",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WhatsappWorkspacePage({ params }: PageProps) {
  const { slug } = await params;

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
    // Anonymous — go through login. Same UX as visiting /admin.
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(`/whatsapp/${slug}`)}`);
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
    // The "self" sender for outgoing-bubble alignment. We use the admin's
    // own display name when ADMIN is viewing, and "אני" when a guest
    // viewer is the workspace's intended recipient (so their messages
    // align as expected).
    selfSender: access.isAdmin ? (access.email ?? "אני") : "אני",
    chats: workspace.chats.map((c) => ({
      id: c.id,
      contactName: c.contactName,
      messageCount: c.messageCount,
      lastAt: c.lastAt ? c.lastAt.toISOString() : null,
      lastTextPreview: null,
    })),
  };

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
            style={{ height: "min(82vh, 820px)" }}
          >
            <div className="flex h-full min-h-0">
              <WhatsappShell workspace={dto} mode="live" />
            </div>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
