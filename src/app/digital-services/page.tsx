import type { Metadata } from "next";
import {
  Code2,
  ArrowLeft,
  Award,
  Briefcase,
  Globe,
  Database,
  Calendar,
  Search,
  Eye,
  FileSearch,
  Scale,
  BarChart3,
  MessageSquare,
  Activity,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getPageContent } from "@/lib/content";
import type { DigitalServicesPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "שירותים דיגיטליים",
  description:
    'ייעוץ והטמעת טכנולוגיה למשרדי עורכי דין ועסקים — LegalTech, ויזואליזציה, מודלי שפה והגנת פרטיות. עו"ד גיא זומר.',
  openGraph: {
    title: 'שירותים דיגיטליים | עו"ד זומר',
    description: "ייעוץ והטמעת טכנולוגיה למשרדי עורכי דין ועסקים.",
  },
};

/* ─── Icon Resolver ─── */

const ICON_MAP: Record<string, LucideIcon> = {
  Database, Calendar, Search, Code2, Globe, BarChart3, FileSearch, Scale, Eye, Briefcase, Award,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Code2;
}

/* ─── Page ─── */

export default async function DigitalServicesPage() {
  const content = await getPageContent<DigitalServicesPageContent>("digital-services");

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <EditableSection editHref="/admin/site-editor/digital-services" editLabel="באנר">
      <section
        aria-labelledby="ds-hero-heading"
        className="bg-primary py-16 sm:py-20"
      >
        <Container>
          <div className="text-center">
            <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
            <h1
              id="ds-hero-heading"
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

      {/* ── Intro ── */}
      <EditableSection editHref="/admin/site-editor/digital-services" editLabel="מבוא">
      <section aria-labelledby="ds-intro-heading" className="py-16 sm:py-20">
        <Container narrow>
          <div className="mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
          <h2
            id="ds-intro-heading"
            className="text-3xl font-bold leading-snug tracking-tight text-primary-dark sm:text-4xl"
          >
            {content.intro.title}
          </h2>
          {content.intro.paragraphs.map((p, i) => (
            <p
              key={i}
              className={cn("text-lg leading-relaxed text-muted", i === 0 ? "mt-6" : "mt-4")}
            >
              {p}
            </p>
          ))}
        </Container>
      </section>
      </EditableSection>

      {/* ── Services Grid ── */}
      <EditableSection editHref="/admin/site-editor/digital-services" editLabel="שירותים">
      <section
        aria-labelledby="ds-services-heading"
        className="relative bg-muted-bg py-16 sm:py-20"
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <Container className="relative">
          <SectionHeading
            id="ds-services-heading"
            title={content.services.title}
            subtitle={content.services.subtitle}
          />

          <div className="space-y-10">
            {content.items.map((item, index) => {
              const Icon = resolveIcon(item.icon);
              // Inject demo buttons into the two cards that have live demos.
              // Matched by title substring — resilient to minor CMS edits.
              const isVisualization = item.title.includes("ויזואליזציה");
              const isRelationships = item.title.includes("ניהול קשרים");
              return (
                <Card
                  key={index}
                  className={cn(
                    "group relative overflow-hidden border border-border/60 bg-white transition-shadow duration-300",
                    "hover:shadow-lg hover:shadow-primary/5",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-1",
                      isVisualization
                        ? "bg-gradient-to-l from-emerald-400 via-amber-400 to-emerald-500"
                        : isRelationships
                          ? "bg-gradient-to-l from-violet-400 via-violet-500 to-violet-600"
                          : "bg-gradient-to-l from-accent via-accent-light to-accent/60",
                    )}
                    aria-hidden="true"
                  />

                  <CardContent className="p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
                      <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-center">
                        <div
                          className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300",
                            isVisualization
                              ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
                              : isRelationships
                                ? "bg-violet-50 text-violet-700 group-hover:bg-violet-100"
                                : "bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent",
                          )}
                        >
                          <Icon className="h-7 w-7" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-bold leading-snug text-primary-dark">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-base font-medium text-accent-text">
                          {item.subtitle}
                        </p>
                        <p className="mt-4 text-base leading-relaxed text-foreground/80">
                          {item.description}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2" aria-label="תגיות">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                "inline-block rounded-full border border-primary/10 bg-primary/5 px-3 py-1",
                                "font-mono text-xs font-medium text-primary-dark",
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Demo buttons — injected only for cards that have live demos */}
                        {isVisualization && (
                          <div className="mt-5 flex flex-wrap gap-3 border-t border-black/5 pt-5">
                            <Link
                              href="/whatsapp"
                              className={cn(
                                "group/btn inline-flex items-center gap-1.5 rounded-full px-4 py-2",
                                "border border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-800",
                                "transition-colors hover:bg-emerald-100",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1",
                              )}
                            >
                              <MessageSquare className="h-4 w-4" aria-hidden="true" />
                              <span>הדגמה: ממשק WhatsApp</span>
                              <ArrowLeft className="h-4 w-4 transition-transform group-hover/btn:-translate-x-0.5" aria-hidden="true" />
                            </Link>
                            <Link
                              href="/timeline"
                              className={cn(
                                "group/btn inline-flex items-center gap-1.5 rounded-full px-4 py-2",
                                "border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-800",
                                "transition-colors hover:bg-amber-100",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1",
                              )}
                            >
                              <Activity className="h-4 w-4" aria-hidden="true" />
                              <span>הדגמה: ציר זמן רב-שכבתי</span>
                              <ArrowLeft className="h-4 w-4 transition-transform group-hover/btn:-translate-x-0.5" aria-hidden="true" />
                            </Link>
                          </div>
                        )}
                        {isRelationships && (
                          <div className="mt-5 flex flex-wrap gap-3 border-t border-black/5 pt-5">
                            <Link
                              href="/workflows"
                              className={cn(
                                "group/btn inline-flex items-center gap-1.5 rounded-full px-4 py-2",
                                "border border-violet-300 bg-violet-50 text-sm font-semibold text-violet-800",
                                "transition-colors hover:bg-violet-100",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-1",
                              )}
                            >
                              <Workflow className="h-4 w-4" aria-hidden="true" />
                              <span>הדגמה: ניהול תהליכי עבודה</span>
                              <ArrowLeft className="h-4 w-4 transition-transform group-hover/btn:-translate-x-0.5" aria-hidden="true" />
                            </Link>
                          </div>
                        )}
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

      {/* ── Credentials ── */}
      <EditableSection editHref="/admin/site-editor/digital-services" editLabel="הסמכות">
      <section aria-labelledby="ds-credentials-heading" className="py-16 sm:py-20">
        <Container narrow>
          <div className="mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
          <h2
            id="ds-credentials-heading"
            className="text-2xl font-bold leading-snug tracking-tight text-primary-dark sm:text-3xl"
          >
            {content.credentials.title}
          </h2>
          <ul className="mt-8 space-y-4">
            {content.credentials.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div
                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"
                  aria-hidden="true"
                >
                  <Award className="h-4 w-4" />
                </div>
                <span className="text-base leading-relaxed text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      </EditableSection>

      {/* ── Career Timeline ── */}
      {content.careerTimeline && content.careerTimeline.entries.length > 0 ? (
        <EditableSection
          editHref="/admin/site-editor/digital-services"
          editLabel="ציר זמן"
        >
          <section
            aria-labelledby="ds-timeline-heading"
            className="relative bg-muted-bg py-16 sm:py-20"
          >
            <Container narrow>
              <div className="mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
              <h2
                id="ds-timeline-heading"
                className="text-2xl font-bold leading-snug tracking-tight text-primary-dark sm:text-3xl"
              >
                {content.careerTimeline.title}
              </h2>
              {content.careerTimeline.subtitle ? (
                <p className="mt-3 text-base leading-relaxed text-muted">
                  {content.careerTimeline.subtitle}
                </p>
              ) : null}

              {/* Vertical timeline. Spine on the right edge (RTL); each entry
                  pulls left of it with a connector dot anchored on the spine.
                  Period sits above role, role above org, description below. */}
              <ol className="relative mt-10 space-y-8 border-r-2 border-primary/15 pr-6 sm:pr-8">
                {content.careerTimeline.entries.map((entry, i) => (
                  <li key={i} className="relative">
                    {/* Dot on the spine */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute right-[-1.86rem] sm:right-[-2.36rem] top-1.5 h-3.5 w-3.5 rounded-full",
                        "border-2 border-primary bg-white shadow-sm",
                      )}
                    />
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-accent-text whitespace-nowrap">
                        {entry.period}
                      </span>
                      <span className="text-lg font-bold leading-snug text-primary-dark">
                        {entry.role}
                      </span>
                    </div>
                    <div className="mt-0.5 text-base font-medium text-foreground/85">
                      {entry.organization}
                    </div>
                    {entry.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {entry.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Container>
          </section>
        </EditableSection>
      ) : null}

      {/* ── CTA ── */}
      <EditableSection editHref="/admin/site-editor/digital-services" editLabel="קריאה לפעולה">
      <section
        aria-labelledby="ds-cta-heading"
        className="bg-primary py-14 sm:py-16"
      >
        <Container>
          <div className="text-center">
            <h2
              id="ds-cta-heading"
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
