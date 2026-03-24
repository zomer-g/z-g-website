import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, Database, Search } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Hero from "@/components/home/hero";
import { getPageContent } from "@/lib/content";
import { getIcon } from "@/lib/icons";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { EditableSection } from "@/components/admin/editable-section";
import type { HomePageContent, ProjectsPageContent } from "@/types/content";

export const dynamic = "force-dynamic";

/* ─── Icon map for projects preview ─── */

const PROJECT_ICONS: Record<string, typeof Database> = { Database, Calendar, Search };

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "עמוד הבית",
  description:
    'עו"ד גיא זומר — משפט פלילי עם גישה אנליטית מבוססת דאטה וטכנולוגיה. ייצוג בחקירות, הליכים פליליים וחופש מידע. ייעוץ ראשוני ללא התחייבות.',
};

/* ─── Page ─── */

export default async function HomePage() {
  const content = await getPageContent<HomePageContent>("home");
  const projectsContent = await getPageContent<ProjectsPageContent>("projects");

  // Fetch services from DB
  let dbServices: { slug: string; title: string; description: string; icon: string | null }[] = [];
  try {
    dbServices = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { slug: true, title: true, description: true, icon: true },
    });
  } catch {
    // DB not available
  }

  // Fetch latest published articles from DB
  let dbArticles: { title: string; excerpt: string; date: string; href: string }[] = [];
  try {
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { title: true, excerpt: true, publishedAt: true, slug: true },
    });
    if (posts.length > 0) {
      dbArticles = posts.map((p) => ({
        title: p.title,
        excerpt: p.excerpt ?? "",
        date: p.publishedAt ? formatDate(p.publishedAt.toISOString()) : "",
        href: `/articles/${p.slug}`,
      }));
    }
  } catch {
    // DB not available
  }

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <EditableSection editHref="/admin/site-editor/home" editLabel="באנר ראשי">
        <Hero content={content.hero} />
      </EditableSection>

      {/* ── Services Preview (from DB) ── */}
      {dbServices.length > 0 && (
        <EditableSection editHref="/admin/services" editLabel="תחומי עיסוק">
        <section aria-labelledby="services-heading" className="py-20 lg:py-28">
          <Container>
            <SectionHeading
              id="services-heading"
              title={content.services.title}
              subtitle={content.services.subtitle}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {dbServices.map((service) => {
                const Icon = getIcon(service.icon ?? "briefcase");
                return (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="group block"
                  >
                    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-accent/30">
                      <CardHeader>
                        <div
                          className={cn(
                            "mb-4 inline-flex h-12 w-12 items-center justify-center",
                            "rounded-lg bg-primary/5 text-primary",
                            "transition-colors duration-300 group-hover:bg-accent/10 group-hover:text-accent"
                          )}
                        >
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <CardTitle>{service.title}</CardTitle>
                        <CardDescription>{service.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-sm font-semibold text-primary",
                            "transition-colors duration-200 group-hover:text-accent"
                          )}
                        >
                          למידע נוסף
                          <ArrowLeft
                            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
        </EditableSection>
      )}

      {/* ── About Preview ── */}
      <EditableSection editHref="/admin/site-editor/home" editLabel="אודות">
      <section
        aria-labelledby="about-preview-heading"
        className="bg-muted-bg py-20 lg:py-28"
      >
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <div className="mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
              <h2
                id="about-preview-heading"
                className="text-3xl font-bold leading-snug tracking-tight text-primary-dark sm:text-4xl"
              >
                {content.aboutPreview.title}
              </h2>
              {content.aboutPreview.paragraphs.map((p, i) => (
                <p key={i} className={cn("text-lg leading-relaxed text-muted", i === 0 ? "mt-6" : "mt-4")}>
                  {p}
                </p>
              ))}
              <div className="mt-8">
                <Button href={content.aboutPreview.ctaLink} variant="primary" size="md">
                  {content.aboutPreview.ctaText}
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[3/4] max-w-xs sm:max-w-sm mx-auto overflow-hidden rounded-2xl shadow-xl">
                <Image
                  src="/images/guy-zomer.jpg"
                  alt="עו״ד גיא זומר – עורך דין פלילי, תמונת פורטרט מקצועית"
                  fill
                  className="object-cover object-top"
                  sizes="(min-width: 1024px) 384px, (min-width: 640px) 384px, 320px"
                  priority
                />
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-xl bg-accent/20" aria-hidden="true" />
                <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-xl bg-accent/15" aria-hidden="true" />
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                צילום:{" "}
                <a
                  href="https://www.nataliemichelson.co.il/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  נטלי מיכלסון
                </a>
              </p>
            </div>
          </div>
        </Container>
      </section>
      </EditableSection>

      {/* ── Projects Preview ── */}
      {projectsContent.projects.length > 0 && (
        <EditableSection editHref="/admin/site-editor/projects" editLabel="מיזמים">
        <section aria-labelledby="projects-preview-heading" className="py-20 lg:py-28">
          <Container>
            <SectionHeading
              id="projects-preview-heading"
              title={content.projectsPreview.title}
              subtitle={content.projectsPreview.subtitle}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {projectsContent.projects.slice(0, 3).map((project, i) => {
                const Icon = PROJECT_ICONS[project.icon] || Database;
                return (
                  <a
                    key={i}
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-accent/30">
                      <CardHeader>
                        <div
                          className={cn(
                            "mb-4 inline-flex h-12 w-12 items-center justify-center",
                            "rounded-lg bg-primary/5 text-primary",
                            "transition-colors duration-300 group-hover:bg-accent/10 group-hover:text-accent"
                          )}
                        >
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <CardTitle className="transition-colors duration-200 group-hover:text-accent">
                          {project.title}
                        </CardTitle>
                        <CardDescription>{project.subtitle}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-sm font-semibold text-primary",
                            "transition-colors duration-200 group-hover:text-accent"
                          )}
                        >
                          לאתר הפרויקט
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Button href={content.projectsPreview.ctaLink} variant="secondary" size="md">
                {content.projectsPreview.ctaText}
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Container>
        </section>
        </EditableSection>
      )}

      {/* ── Articles Preview (from DB) ── */}
      {dbArticles.length > 0 && (
        <EditableSection editHref="/admin/posts" editLabel="מאמרים">
        <section aria-labelledby="articles-heading" className="py-20 lg:py-28">
          <Container>
            <SectionHeading
              id="articles-heading"
              title={content.articles.title}
              subtitle={content.articles.subtitle}
            />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {dbArticles.map((article) => (
                <Link key={article.title} href={article.href} className="group block">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div className="h-48 rounded-t-xl bg-gradient-to-br from-primary/10 to-primary/5" />
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        <time>{article.date}</time>
                      </div>
                      <CardTitle className={cn("transition-colors duration-200 group-hover:text-accent")}>
                        {article.title}
                      </CardTitle>
                      <CardDescription>{article.excerpt}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-semibold text-primary",
                          "transition-colors duration-200 group-hover:text-accent"
                        )}
                      >
                        קראו עוד
                        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button href="/articles" variant="secondary" size="md">
                {content.articles.ctaText}
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Container>
        </section>
        </EditableSection>
      )}

      {/* ── CTA Section ── */}
      <EditableSection editHref="/admin/site-editor/home" editLabel="קריאה לפעולה">
      <section
        aria-labelledby="cta-heading"
        className="relative overflow-hidden bg-primary py-20 lg:py-28"
      >
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary-dark/80 to-primary" />
          <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent/3 blur-3xl" />
        </div>

        <Container className="relative text-center">
          <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
          <h2
            id="cta-heading"
            className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl"
          >
            {content.cta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            {content.cta.description}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href={content.cta.ctaLink} variant="accent" size="lg">
              {content.cta.ctaText}
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              href={content.cta.phoneHref}
              variant="secondary"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              {content.cta.phone}
            </Button>
          </div>
        </Container>
      </section>
      </EditableSection>
    </PublicLayout>
  );
}
