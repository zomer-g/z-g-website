import type { Metadata } from "next";
import { Play, ExternalLink, Newspaper, Mic, Tv } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getPageContent } from "@/lib/content";
import type { MediaPageContent } from "@/types/content";

export const dynamic = "force-dynamic";

/* ---- Metadata ---- */

export const metadata: Metadata = {
  title: "מדיה",
  description:
    "ראיונות, הרצאות והופעות מדיה של עורכי דין ממשרד זומר. סיקור תקשורתי, כנסים מקצועיים ופרסומים בתחום המשפט.",
  openGraph: {
    title: "מדיה | זומר - משרד עורכי דין",
    description:
      "ראיונות, הרצאות והופעות מדיה של עורכי דין ממשרד זומר.",
  },
};

/* ---- Type Config ---- */

type MediaType = "video" | "article" | "podcast";

const MEDIA_TYPE_ICONS: Record<MediaType, { icon: React.ElementType; color: string }> = {
  video: { icon: Play, color: "bg-red-500/10 text-red-600" },
  article: { icon: Newspaper, color: "bg-blue-500/10 text-blue-600" },
  podcast: { icon: Mic, color: "bg-purple-500/10 text-purple-600" },
};

/* ---- Fetch ---- */

async function getMediaAppearances() {
  try {
    return await prisma.mediaAppearance.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
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

  /* Build type labels from CMS content */
  const typeLabels: Record<MediaType, string> = {
    video: pageContent.typeLabels.video,
    article: pageContent.typeLabels.article,
    podcast: pageContent.typeLabels.podcast,
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
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

      {/* Media Grid Section */}
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
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
              aria-label="רשימת פריטי מדיה"
            >
              {items.map((item) => {
                const mediaType = item.type as MediaType;
                const typeIcon = MEDIA_TYPE_ICONS[mediaType] ?? MEDIA_TYPE_ICONS.video;
                const TypeIcon = typeIcon.icon;
                const label = typeLabels[mediaType] ?? typeLabels.video;

                const cardContent = (
                  <Card
                    role="listitem"
                    className={cn(
                      "group flex flex-col overflow-hidden",
                      "hover:shadow-md hover:border-accent/30",
                    )}
                  >
                    {/* Media Thumbnail Placeholder */}
                    <div
                      className={cn(
                        "relative flex h-48 items-center justify-center",
                        "bg-gradient-to-br from-primary/5 to-primary/15",
                      )}
                      aria-hidden="true"
                    >
                      <div
                        className={cn(
                          "flex h-16 w-16 items-center justify-center rounded-full",
                          "bg-white/90 shadow-lg",
                          "transition-transform duration-200 group-hover:scale-110",
                        )}
                      >
                        {item.type === "video" ? (
                          <Play className="h-7 w-7 text-primary ms-1" />
                        ) : item.type === "article" ? (
                          <ExternalLink className="h-7 w-7 text-primary" />
                        ) : (
                          <Mic className="h-7 w-7 text-primary" />
                        )}
                      </div>
                    </div>

                    <CardContent className="flex flex-1 flex-col">
                      {/* Type Badge & Date */}
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                            typeIcon.color,
                          )}
                        >
                          <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {label}
                        </span>
                        <time className="text-xs text-muted">{item.date}</time>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold leading-snug text-primary-dark">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                        {item.description}
                      </p>

                      {/* Source */}
                      <p className="mt-4 border-t border-border pt-3 text-xs font-medium text-muted">
                        מקור:{" "}
                        <span className="text-primary-dark">{item.source}</span>
                      </p>
                    </CardContent>
                  </Card>
                );

                if (item.url) {
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {cardContent}
                    </a>
                  );
                }

                return <div key={item.id}>{cardContent}</div>;
              })}
            </div>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
