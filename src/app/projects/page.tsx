import type { Metadata } from "next";
import {
  ExternalLink,
  Database,
  Calendar,
  Search,
  Code2,
  ArrowLeft,
  Globe,
  BarChart3,
  FileSearch,
  Scale,
  Eye,
  type LucideIcon,
} from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getPageContent } from "@/lib/content";
import type { ProjectsPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "מיזמים",
  description:
    'מיזמים אקטיביסטיים בממשקים של דאטה, משפט וטכנולוגיה. עו"ד גיא זומר — שקיפות, נגישות מידע ואחריותיות ציבורית.',
  openGraph: {
    title: 'מיזמים | עו"ד זומר',
    description:
      "מיזמים אקטיביסטיים בממשקים של דאטה, משפט וטכנולוגיה.",
  },
};

/* ─── Icon Resolver ─── */

const ICON_MAP: Record<string, LucideIcon> = {
  Database,
  Calendar,
  Search,
  Code2,
  Globe,
  BarChart3,
  FileSearch,
  Scale,
  Eye,
  ExternalLink,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Code2;
}

/* ─── Page ─── */

export default async function ProjectsPage() {
  const content = await getPageContent<ProjectsPageContent>("projects");

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <EditableSection editHref="/admin/site-editor/projects" editLabel="באנר">
      <section
        aria-labelledby="projects-hero-heading"
        className="bg-primary py-16 sm:py-20"
      >
        <Container>
          <div className="text-center">
            <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
            <h1
              id="projects-hero-heading"
              className={cn(
                "text-3xl font-bold leading-snug tracking-tight text-white",
                "sm:text-4xl lg:text-5xl",
              )}
            >
              {content.hero.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              {content.hero.subtitle}
            </p>
          </div>
        </Container>
      </section>
      </EditableSection>

      {/* ── Projects Grid ── */}
      <EditableSection editHref="/admin/site-editor/projects" editLabel="מיזמים">
      <section
        aria-labelledby="projects-list-heading"
        className="relative py-16 sm:py-20"
      >
        {/* Subtle dot-grid background — tech element */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <Container className="relative">
          <h2 id="projects-list-heading" className="sr-only">
            רשימת מיזמים
          </h2>

          <div className="space-y-10">
            {content.projects.map((project, index) => {
              const Icon = resolveIcon(project.icon);
              return (
                <Card
                  key={index}
                  className={cn(
                    "group relative overflow-hidden border border-border/60 bg-white transition-shadow duration-300",
                    "hover:shadow-lg hover:shadow-primary/5",
                  )}
                >
                  {/* Accent top border */}
                  <div
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-accent via-accent-light to-accent/60"
                    aria-hidden="true"
                  />

                  <CardContent className="p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
                      {/* Icon */}
                      <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-center">
                        <div
                          className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-xl",
                            "bg-primary/5 text-primary transition-colors duration-300",
                            "group-hover:bg-accent/10 group-hover:text-accent",
                          )}
                        >
                          <Icon className="h-7 w-7" aria-hidden="true" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-bold leading-snug text-primary-dark">
                          {project.title}
                        </h3>
                        <p className="mt-1 text-base font-medium text-accent">
                          {project.subtitle}
                        </p>
                        <p className="mt-4 text-base leading-relaxed text-foreground/80">
                          {project.description}
                        </p>

                        {/* Tags */}
                        <div
                          className="mt-5 flex flex-wrap gap-2"
                          aria-label="תגיות"
                        >
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                "inline-block rounded-full border border-primary/10 bg-primary/5 px-3 py-1",
                                "font-mono text-xs font-medium text-primary-dark/70",
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Link */}
                        <div className="mt-6">
                          <Link
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-5 py-2.5",
                              "text-sm font-bold text-primary-dark transition-all duration-200",
                              "hover:border-accent hover:bg-accent hover:text-primary-dark",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                            )}
                          >
                            <span>לאתר הפרויקט</span>
                            <span className="sr-only"> (נפתח בחלון חדש)</span>
                            <ExternalLink
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>
      </EditableSection>

      {/* ── CTA ── */}
      <EditableSection editHref="/admin/site-editor/projects" editLabel="קריאה לפעולה">
      <section
        aria-labelledby="projects-cta-heading"
        className="bg-primary py-14 sm:py-16"
      >
        <Container>
          <div className="text-center">
            <h2
              id="projects-cta-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              {content.cta.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/80">
              {content.cta.description}
            </p>
            <div className="mt-8">
              <Link
                href={content.cta.ctaLink}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3",
                  "text-base font-bold text-primary-dark transition-colors duration-200",
                  "hover:bg-accent-light",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                )}
              >
                <span>{content.cta.ctaText}</span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>
      </EditableSection>
    </PublicLayout>
  );
}
