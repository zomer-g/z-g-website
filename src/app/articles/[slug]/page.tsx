import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Calendar, User, ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";
import { getPageContent } from "@/lib/content";
import type { ArticleDetailContent } from "@/types/content";

export const dynamic = "force-dynamic";

/* ─── Category Labels ─── */

const CATEGORY_LABELS: Record<string, string> = {
  "corporate-law": "דיני חברות",
  "real-estate": 'נדל"ן',
  litigation: "ליטיגציה",
  "labor-law": "דיני עבודה",
  "intellectual-property": "קניין רוחני",
  "tax-law": "דיני מסים",
};

/* ─── CSS Gradient for Article Header ─── */

const HEADER_GRADIENTS: Record<string, string> = {
  "corporate-law": "from-primary via-primary-light to-primary-dark",
  "real-estate": "from-primary-dark via-primary to-accent/40",
  litigation: "from-accent/60 via-primary-light to-primary",
  "labor-law": "from-primary-light via-accent/30 to-primary-dark",
  "intellectual-property": "from-primary via-accent/20 to-primary-light",
  "tax-law": "from-primary-dark via-primary-light to-accent/50",
};

/* ─── Fetch article from DB ─── */

async function getArticle(slug: string) {
  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    if (!post || post.status !== "PUBLISHED") return null;

    return post;
  } catch {
    return null;
  }
}

/* ─── Fetch related articles ─── */

async function getRelatedArticles(currentSlug: string, category?: string | null) {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        slug: { not: currentSlug },
        ...(category ? { category } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        publishedAt: true,
      },
    });

    // If not enough from same category, fill with other articles
    if (posts.length < 3 && category) {
      const more = await prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          slug: { notIn: [currentSlug, ...posts.map((p) => p.slug)] },
        },
        orderBy: { publishedAt: "desc" },
        take: 3 - posts.length,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          publishedAt: true,
        },
      });
      return [...posts, ...more];
    }

    return posts;
  } catch {
    return [];
  }
}

/* ─── Dynamic Metadata ─── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "מאמר לא נמצא | זומר - משרד עורכי דין" };
  }

  return {
    title: `${article.title} | מאמרים | זומר - משרד עורכי דין`,
    description: article.excerpt || article.seoDesc || undefined,
  };
}

/* ─── Page Component ─── */

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [article, cms] = await Promise.all([
    getArticle(slug),
    getPageContent<ArticleDetailContent>("article-detail"),
  ]);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(slug, article.category);
  const categoryLabel = article.category
    ? CATEGORY_LABELS[article.category] ?? article.category
    : "";
  const headerGradient =
    HEADER_GRADIENTS[article.category ?? ""] ?? HEADER_GRADIENTS["corporate-law"];
  const authorName = article.author?.name ?? "צוות משרד זומר";

  /* Build author bio from template */
  const authorBio = categoryLabel
    ? cms.strings.authorTemplate.replace("{category}", categoryLabel)
    : "";

  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <nav
        aria-label="מיקום נוכחי"
        className="border-b border-border bg-muted-bg"
      >
        <Container className="py-3">
          <ol
            className="flex flex-wrap items-center gap-2 text-sm"
            role="list"
          >
            <li>
              <Link
                href="/"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                {cms.strings.breadcrumbHome}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <Link
                href="/articles"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                {cms.strings.breadcrumbArticles}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <span className="font-semibold text-primary-dark" aria-current="page">
                {article.title}
              </span>
            </li>
          </ol>
        </Container>
      </nav>

      {/* Article Header */}
      <header
        className={`bg-gradient-to-br ${headerGradient} py-16 sm:py-24`}
        aria-labelledby="article-heading"
      >
        <Container>
          <div className="max-w-3xl">
            {categoryLabel && (
              <Badge
                variant="accent"
                className="mb-4 text-sm"
              >
                {categoryLabel}
              </Badge>
            )}

            <h1
              id="article-heading"
              className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {article.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-6 text-white/80">
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{authorName}</span>
              </span>
              {article.publishedAt && (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={article.publishedAt.toISOString()}>
                    {formatDate(article.publishedAt.toISOString())}
                  </time>
                </span>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* Article Body + Sidebar */}
      <section className="bg-background py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Article Body */}
            <article className="lg:col-span-2">
              <div className="prose-rtl">
                <TipTapRenderer content={article.content as Record<string, unknown>} />

                <hr className="my-10 border-border" />

                <p className="text-sm text-muted">
                  <strong className="text-primary-dark">{cms.disclaimer.label}</strong>{" "}
                  {cms.disclaimer.text}{" "}
                  <Link
                    href={cms.disclaimer.linkHref}
                    className="font-semibold text-primary underline underline-offset-2 hover:text-accent"
                  >
                    {cms.disclaimer.linkText}
                  </Link>
                  .
                </p>
              </div>
            </article>

            {/* Sidebar */}
            <aside aria-label={cms.strings.sidebarRelatedTitle} className="space-y-8">
              {/* Author Card */}
              <Card>
                <CardContent className="p-6">
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                    aria-hidden="true"
                  >
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-primary-dark">
                    {authorName}
                  </h2>
                  {authorBio && (
                    <p className="mt-1 text-sm text-muted">
                      {authorBio}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div>
                  <h2 className="mb-4 text-lg font-bold text-primary-dark">
                    {cms.strings.sidebarRelatedTitle}
                  </h2>
                  <ul role="list" className="space-y-4">
                    {relatedArticles.map((related) => (
                      <li key={related.slug}>
                        <Link
                          href={`/articles/${related.slug}`}
                          className="group block rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-accent/30 hover:shadow-sm focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                        >
                          {related.category && (
                            <Badge variant="accent" className="mb-2 text-xs">
                              {CATEGORY_LABELS[related.category] ?? related.category}
                            </Badge>
                          )}
                          <CardTitle className="text-base group-hover:text-accent transition-colors duration-200">
                            {related.title}
                          </CardTitle>
                          {related.publishedAt && (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                              <Calendar
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <time dateTime={related.publishedAt.toISOString()}>
                                {formatDate(related.publishedAt.toISOString())}
                              </time>
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <Card className="border-accent/30 bg-primary text-white">
                <CardContent className="p-6 text-center">
                  <h2 className="text-xl font-bold text-white">
                    {cms.sidebarCta.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {cms.sidebarCta.description}
                  </p>
                  <Link
                    href={cms.sidebarCta.ctaLink}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-bold text-primary-dark transition-colors duration-200 hover:bg-accent-light focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    {cms.sidebarCta.ctaText}
                  </Link>
                </CardContent>
              </Card>
            </aside>
          </div>
        </Container>
      </section>

      {/* More Articles Section */}
      {relatedArticles.length > 0 && (
        <section
          className="bg-muted-bg py-16"
          aria-labelledby="more-articles-heading"
        >
          <Container>
            <h2
              id="more-articles-heading"
              className="mb-8 text-center text-2xl font-bold text-primary-dark sm:text-3xl"
            >
              {cms.strings.moreArticlesTitle}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/articles/${related.slug}`}
                  className="group block focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-xl"
                  aria-label={`${related.title} — ${cms.strings.readMoreText}`}
                >
                  <Card className="flex h-full flex-col hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200">
                    <CardHeader>
                      {related.category && (
                        <Badge variant="accent" className="w-fit">
                          {CATEGORY_LABELS[related.category] ?? related.category}
                        </Badge>
                      )}
                      <CardTitle className="mt-2 group-hover:text-accent transition-colors duration-200">
                        {related.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm leading-relaxed text-muted line-clamp-3">
                        {related.excerpt ?? ""}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-accent transition-colors duration-200">
                        {cms.strings.readMoreText}
                        <ArrowLeft
                          className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}
    </PublicLayout>
  );
}
