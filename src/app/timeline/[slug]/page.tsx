import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  WhatsappShell,
  timelineApiPaths,
} from "@/components/conversation/conversation-shell";
import { prisma } from "@/lib/prisma";
import { getSessionAccess, canAccessProject } from "@/lib/timeline-auth";
import type { WhatsappWorkspaceDTO } from "@/components/conversation/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "אזור עבודה — ציר זמן",
};

interface PageProps {
  params: Promise<{ slug: string }>;
  // Same ?view=clean mode as /whatsapp/[slug].
  searchParams: Promise<{ view?: string | string[] }>;
}

const CLEAN_VIEW_VALUES = new Set(["clean", "0", "embed", "raw"]);

function isCleanView(sp: { view?: string | string[] }): boolean {
  const v = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  return typeof v === "string" && CLEAN_VIEW_VALUES.has(v.toLowerCase());
}

export default async function TimelineWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const cleanView = isCleanView(sp);

  const project = await prisma.timelineProject.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      layers: {
        select: {
          id: true,
          title: true,
          selfActor: true,
          _count: { select: { events: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) notFound();

  const access = await getSessionAccess();
  if (!access.role) {
    const target = cleanView
      ? `/timeline/${slug}?view=clean`
      : `/timeline/${slug}`;
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  const allowed = await canAccessProject(project.id, access);
  if (!allowed) notFound();

  const dto: WhatsappWorkspaceDTO = {
    id: project.id,
    title: project.title,
    selfSender: "",
    chats: project.layers.map((l) => ({
      id: l.id,
      contactName: l.title,
      // Timeline uses `selfActor` as its self-identifier; we re-key it
      // to selfSender for the shared shell. Identical semantics.
      selfSender: l.selfActor ?? null,
      messageCount: l._count.events,
      lastAt: null,
      lastTextPreview: null,
    })),
  };

  if (cleanView) {
    return (
      <div dir="rtl" className="flex h-screen flex-col bg-[#dadbd3]">
        <WhatsappShell
          workspace={dto}
          mode="live"
          isAdmin={access.isAdmin}
          apiPaths={timelineApiPaths}
        />
      </div>
    );
  }

  return (
    <PublicLayout>
      <Container className="py-4">
        <div dir="rtl" className="space-y-3">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-primary-dark truncate">
              {project.title}
            </h1>
            <span className="text-xs text-gray-500">
              {project.layers.length} שכבות
            </span>
          </header>
          <div
            className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
            style={{ height: "min(88vh, 900px)", minHeight: "560px" }}
          >
            <div className="flex h-full min-h-0">
              <WhatsappShell
                workspace={dto}
                mode="live"
                isAdmin={access.isAdmin}
                apiPaths={timelineApiPaths}
              />
            </div>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
