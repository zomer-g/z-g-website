import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Calendar, User, ArrowLeft, FileText } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { formatDate, safeHref } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";

/* ─── PDF attachments ─── */

interface PostAttachment {
  name: string;
  url: string;
}

function getAttachments(raw: unknown): PostAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is PostAttachment =>
      !!a &&
      typeof a === "object" &&
      typeof (a as PostAttachment).name === "string" &&
      typeof (a as PostAttachment).url === "string",
  );
}

export const dynamic = "force-dynamic";

/* ─── Fetch post from DB ─── */

async function getPost(slug: string) {
  try {
    const post = await prisma.plilistPost.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    });

    if (!post || post.status !== "PUBLISHED") return null;

    return post;
  } catch {
    return null;
  }
}

/* ─── Fetch related (latest other) posts ─── */

async function getRelatedPosts(currentSlug: string) {
  try {
    return await prisma.plilistPost.findMany({
      where: { status: "PUBLISHED", slug: { not: currentSlug } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
      },
    });
  } catch {
    return [];
  }
}

/* ─── Dynamic Metadata ─── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'פוסט לא נמצא | הפליליסט הדיגיטלי', robots: { index: false } };
  }

  return {
    title: `${post.title} | הפליליסט הדיגיטלי`,
    description: post.excerpt || post.seoDesc || undefined,
    robots: { index: false, follow: false },
  };
}

/* ─── Page Component ─── */

export default async function PlilistPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(slug);
  const authorName = post.author?.name ?? 'עו"ד גיא זומר';
  const attachments = getAttachments(post.attachments);

  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <nav aria-label="מיקום נוכחי" className="border-b border-border bg-muted-bg">
        <Container className="py-3">
          <ol className="flex flex-wrap items-center gap-2 text-sm" role="list">
            <li>
              <Link
                href="/"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                בית
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <Link
                href="/haplilist"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                הפליליסט הדיגיטלי
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <span
                className="font-semibold text-primary-dark"
                aria-current="page"
              >
                {post.title}
              </span>
            </li>
          </ol>
        </Container>
      </nav>

      {/* Post Header */}
      <header
        className="bg-gradient-to-br from-primary via-primary-light to-primary-dark py-16 sm:py-24"
        aria-labelledby="post-heading"
      >
        <Container>
          <div className="max-w-3xl">
            <h1
              id="post-heading"
              className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {post.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-6 text-white/80">
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{authorName}</span>
              </span>
              {post.publishedAt && (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.publishedAt.toISOString()}>
                    {formatDate(post.publishedAt.toISOString())}
                  </time>
                </span>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* Post Body + Sidebar */}
      <section className="bg-background py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Post Body */}
            <article className="lg:col-span-2">
              <div className="prose-rtl">
                <TipTapRenderer
                  content={post.content as Record<string, unknown>}
                />
              </div>

              {/* PDF Attachments */}
              {attachments.length > 0 && (
                <section
                  aria-labelledby="post-attachments-heading"
                  className="mt-12 border-t border-border pt-8"
                >
                  <h2
                    id="post-attachments-heading"
                    className="mb-4 text-lg font-bold text-primary-dark"
                  >
                    מסמכים מצורפים
                  </h2>
                  <ul role="list" className="space-y-3">
                    {attachments.map((att, i) => (
                      <li key={`${att.url}-${i}`}>
                        <a
                          href={safeHref(att.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-accent/40 hover:shadow-sm focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            aria-hidden="true"
                          >
                            <FileText className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-foreground group-hover:text-accent transition-colors duration-200">
                              {att.name}
                            </span>
                            <span className="text-xs text-muted">
                              PDF · פתיחה בכרטיסייה חדשה
                            </span>
                          </span>
                          <ArrowLeft
                            className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:-translate-x-1"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>

            {/* Sidebar */}
            <aside aria-label="עוד מהפליליסט הדיגיטלי" className="space-y-8">
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
                  <p className="mt-1 text-sm text-muted">
                    כותב על המשפט הפלילי מפרספקטיבה אישית.
                  </p>
                </CardContent>
              </Card>

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div>
                  <h2 className="mb-4 text-lg font-bold text-primary-dark">
                    עוד מהפליליסט הדיגיטלי
                  </h2>
                  <ul role="list" className="space-y-4">
                    {relatedPosts.map((related) => (
                      <li key={related.slug}>
                        <Link
                          href={`/haplilist/${related.slug}`}
                          className="group block rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-accent/30 hover:shadow-sm focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                        >
                          <CardTitle className="text-base group-hover:text-accent transition-colors duration-200">
                            {related.title}
                          </CardTitle>
                          {related.publishedAt && (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                              <Calendar
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <time
                                dateTime={related.publishedAt.toISOString()}
                              >
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
            </aside>
          </div>
        </Container>
      </section>

      {/* More Posts Section */}
      {relatedPosts.length > 0 && (
        <section
          className="bg-muted-bg py-16"
          aria-labelledby="more-posts-heading"
        >
          <Container>
            <h2
              id="more-posts-heading"
              className="mb-8 text-center text-2xl font-bold text-primary-dark sm:text-3xl"
            >
              עוד פוסטים
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/haplilist/${related.slug}`}
                  className="group block focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-xl"
                  aria-label={`${related.title} — קראו עוד`}
                >
                  <Card className="flex h-full flex-col hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200">
                    <CardHeader>
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
                        קראו עוד
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
