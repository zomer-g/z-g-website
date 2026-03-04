import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
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
import type { HomePageContent } from "@/types/content";

export const dynamic = "force-dynamic";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "עמוד הבית",
  description:
    'משרד עורכי דין זומר - ייצוג משפטי מקצועי ברמה הגבוהה ביותר. מומחיות בדיני חברות, נדל"ן, ליטיגציה ועוד. ייעוץ ראשוני ללא התחייבות.',
};

/* ─── Page ─── */

export default async function HomePage() {
  const content = await getPageContent<HomePageContent>("home");

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
      <Hero content={content.hero} />

      {/* ── Services Preview (from DB) ── */}
      {dbServices.length > 0 && (
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
      )}

      {/* ── About Preview ── */}
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

            <div className="relative hidden lg:block" aria-hidden="true">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-xl">
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-xl bg-accent/20" />
                <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-xl bg-accent/15" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-16 w-16 text-white/20">
                      {(() => { const ScaleIcon = getIcon("Scale"); return <ScaleIcon className="h-16 w-16" />; })()}
                    </div>
                    <div className="mt-4 h-0.5 w-24 mx-auto bg-accent/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Articles Preview (from DB) ── */}
      {dbArticles.length > 0 && (
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
      )}

      {/* ── CTA Section ── */}
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
    </PublicLayout>
  );
}
