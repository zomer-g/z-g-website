import type { Metadata } from "next";
import { Tv } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getPageContent } from "@/lib/content";
import type { MediaPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";
import { MediaTabs } from "./media-tabs";

export const dynamic = "force-dynamic";

/* ---- Metadata ---- */

export const metadata: Metadata = {
  title: "פרסומים",
  description:
    "כתבות תקשורת, מחקרים ופרסומים אקדמיים של עו\"ד זומר — חופש מידע, דאטה ומשפט.",
  openGraph: {
    title: "פרסומים | עו\"ד זומר",
    description: "כתבות תקשורת ופרסומים אקדמיים של עו\"ד זומר.",
  },
};

/* ---- Fetch ---- */

async function getMediaAppearances() {
  try {
    return await prisma.mediaAppearance.findMany({
      where: { isActive: true },
      orderBy: { date: "desc" },
    });
  } catch {
    return [];
  }
}

/* ---- Page Component ---- */

export default async function MediaPage() {
  const [items, pageContent] = await Promise.all([
    getMediaAppearances(),
    getPageContent<MediaPageContent>("media"),
  ]);

  // Split by type: "academic" → אקדמיה tab; everything else → תקשורת tab
  const pressItems    = items.filter((i) => i.type !== "academic");
  const academicItems = items.filter((i) => i.type === "academic");

  const typeLabels: Record<string, string> = {
    video:    pageContent.typeLabels.video,
    article:  pageContent.typeLabels.article,
    podcast:  pageContent.typeLabels.podcast,
    academic: pageContent.typeLabels.academic ?? "מחקר / אקדמיה",
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <EditableSection editHref="/admin/site-editor/media" editLabel="באנר">
      <section
        aria-labelledby="media-hero-heading"
        className="bg-primary py-16 sm:py-20"
      >
        <Container>
          <div className="text-center">
            <h1
              id="media-hero-heading"
              className={cn(
                "text-3xl font-bold leading-snug tracking-tight text-white",
                "sm:text-4xl lg:text-5xl",
              )}
            >
              {pageContent.hero.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              {pageContent.hero.subtitle}
            </p>
          </div>
        </Container>
      </section>
      </EditableSection>

      {/* Tabbed Grid Section */}
      <EditableSection editHref="/admin/media-appearances" editLabel="פרסומים">
      <section aria-labelledby="media-grid-heading" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            title={pageContent.grid.title}
            subtitle={pageContent.grid.subtitle}
          />

          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Tv className="mx-auto mb-3 h-10 w-10 text-muted" />
              <p className="text-muted">{pageContent.grid.emptyState}</p>
            </div>
          ) : (
            <MediaTabs
              pressItems={pressItems}
              academicItems={academicItems}
              typeLabels={typeLabels}
            />
          )}
        </Container>
      </section>
      </EditableSection>
    </PublicLayout>
  );
}
