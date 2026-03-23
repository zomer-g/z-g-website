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
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getPageContent } from "@/lib/content";
import type { ArticlesPageContent } from "@/types/content";

export const dynamic = "force-dynamic";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "מאמרים | עו\"ד זומר",
  description:
    "מאמרים מקצועיים בתחומי המשפט הפלילי. תובנות משפטיות מעו\"ד זומר.",
};

/* ─── CSS Gradient Patterns for Article Covers ─── */

const COVER_GRADIENTS: readonly string[] = [
  "bg-gradient-to-br from-primary via-primary-light to-primary-dark",
  "bg-gradient-to-br from-primary-dark via-primary to-accent/40",
  "bg-gradient-to-br from-accent/60 via-primary-light to-primary",
  "bg-gradient-to-br from-primary-light via-accent/30 to-primary-dark",
  "bg-gradient-to-br from-primary via-accent/20 to-primary-light",
  "bg-gradient-to-br from-primary-dark via-primary-light to-accent/50",
] as const;

/* ─── Fetch articles from DB ─── */

async function getArticles() {
  try {
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        publishedAt: true,
        coverImage: true,
      },
    });

    return posts;
  } catch {
    return [];
  }
}

/* ─── Category labels ─── */

const CATEGORY_LABELS: Record<string, string> = {
  "corporate-law": "דיני חברות",
  "real-estate": 'נדל"ן',
  litigation: "ליטיגציה",
  "labor-law": "דיני עבודה",
  "intellectual-property": "קניין רוחני",
  "tax-law": "דיני מסים",
};

/* ─── Page Component ─── */

export default async function ArticlesPage() {
  const [articles, pageContent] = await Promise.all([
    getArticles(),
    getPageContent<ArticlesPageContent>("articles"),
  ]);

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        className="bg-primary py-20 sm:py-28"
        aria-labelledby="articles-hero-heading"
      >
        <Container className="text-center">
          <div
            className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent"
            aria-hidden="true"
          />
          <h1
            id="articles-hero-heading"
            className="text-4xl font-bold leading-snug tracking-tight text-white sm:text-5xl"
          >
            {pageContent.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            {pageContent.hero.subtitle}
          </p>
        </Container>
      </section>

      {/* Articles Grid */}
      <section
        className="bg-background py-16 sm:py-24"
        aria-labelledby="articles-grid-heading"
      >
        <Container>
          <SectionHeading
            title={pageContent.grid.title}
            subtitle={pageContent.grid.subtitle}
            id="articles-grid-heading"
          />

          {articles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted">{pageContent.grid.emptyStateTitle}</p>
              <p className="mt-2 text-sm text-muted">
                {pageContent.grid.emptyStateSubtitle}
              </p>
            </div>
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            >
              {articles.map((article, index) => (
                <li key={article.slug}>
                  <Link
                    href={`/articles/${article.slug}`}
                    className="group block h-full focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-xl"
                    aria-label={`${article.title} — ${pageContent.grid.readMoreText}`}
                  >
                    <Card className="flex h-full flex-col overflow-hidden hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200">
                      {/* Cover Image or Gradient */}
                      {article.coverImage ? (
                        <div className="relative h-48 w-full overflow-hidden">
                          <img
                            src={article.coverImage}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={`${COVER_GRADIENTS[index % COVER_GRADIENTS.length]} relative h-48 w-full`}
                          aria-hidden="true"
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <span className="text-7xl font-bold text-white">
                              {article.title.charAt(0)}
                            </span>
                          </div>
                        </div>
                      )}

                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {article.category && (
                            <Badge variant="accent">
                              {CATEGORY_LABELS[article.category] ??
                                article.category}
                            </Badge>
                          )}
                          {article.publishedAt && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted">
                              <Calendar
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <time
                                dateTime={article.publishedAt.toISOString()}
                              >
                                {formatDate(
                                  article.publishedAt.toISOString(),
                                )}
                              </time>
                            </span>
                          )}
                        </div>
                        <CardTitle className="mt-2 group-hover:text-accent transition-colors duration-200">
                          {article.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1">
                        <CardDescription className="line-clamp-3">
                          {article.excerpt ?? ""}
                        </CardDescription>
                      </CardContent>

                      <CardFooter>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-accent transition-colors duration-200">
                          {pageContent.grid.readMoreText}
                          <ArrowLeft
                            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {/* Newsletter CTA */}
      <section
        className="bg-muted-bg py-16"
        aria-labelledby="articles-cta-heading"
      >
        <Container className="text-center">
          <h2
            id="articles-cta-heading"
            className="text-2xl font-bold text-primary-dark sm:text-3xl"
          >
            {pageContent.cta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            {pageContent.cta.description}
          </p>
          <div className="mt-8">
            <Link
              href={pageContent.cta.ctaLink}
              className="inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-lg font-bold text-primary-dark transition-colors duration-200 hover:bg-accent-light focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              {pageContent.cta.ctaText}
            </Link>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
