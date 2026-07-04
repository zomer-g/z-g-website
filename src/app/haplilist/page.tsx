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
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ─── Metadata ─── */
// robots: noindex — the blog is "soft-launched": reachable by URL but kept out
// of search engines (and the site nav) until it's made public.

export const metadata: Metadata = {
  title: 'הפליליסט | עו"ד גיא זומר',
  description:
    "הבלוג האישי של עו\"ד גיא זומר — פרספקטיבה אישית על המשפט הפלילי, מערכת המשפט והחיים שסביבם.",
  robots: { index: false, follow: false },
};

/* ─── CSS Gradient Patterns for Post Covers ─── */

const COVER_GRADIENTS: readonly string[] = [
  "bg-gradient-to-br from-primary via-primary-light to-primary-dark",
  "bg-gradient-to-br from-primary-dark via-primary to-accent/40",
  "bg-gradient-to-br from-accent/60 via-primary-light to-primary",
  "bg-gradient-to-br from-primary-light via-accent/30 to-primary-dark",
  "bg-gradient-to-br from-primary via-accent/20 to-primary-light",
  "bg-gradient-to-br from-primary-dark via-primary-light to-accent/50",
] as const;

/* ─── Fetch posts from DB ─── */

async function getPosts() {
  try {
    return await prisma.plilistPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        coverImage: true,
      },
    });
  } catch {
    return [];
  }
}

/* ─── Page Component ─── */

export default async function HaplilistPage() {
  const posts = await getPosts();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        className="bg-primary py-20 sm:py-28"
        aria-labelledby="haplilist-hero-heading"
      >
        <Container className="text-center">
          <div
            className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent"
            aria-hidden="true"
          />
          <h1
            id="haplilist-hero-heading"
            className="text-4xl font-bold leading-snug tracking-tight text-white sm:text-5xl"
          >
            הפליליסט
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            הבלוג האישי שלי — פרספקטיבה אישית על המשפט הפלילי, מערכת המשפט
            והאנשים שמאחורי התיקים.
          </p>
        </Container>
      </section>

      {/* Posts Grid */}
      <section
        className="bg-background py-16 sm:py-24"
        aria-labelledby="haplilist-grid-heading"
      >
        <Container>
          <SectionHeading
            title="הפוסטים האחרונים"
            subtitle="מחשבות, דעות ותובנות מהשטח"
            id="haplilist-grid-heading"
          />

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted">עדיין אין פוסטים</p>
              <p className="mt-2 text-sm text-muted">
                הפוסט הראשון בדרך — חזרו בקרוב.
              </p>
            </div>
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            >
              {posts.map((post, index) => (
                <li key={post.slug}>
                  <Link
                    href={`/haplilist/${post.slug}`}
                    className="group block h-full focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-xl"
                    aria-label={`${post.title} — קראו עוד`}
                  >
                    <Card className="flex h-full flex-col overflow-hidden hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200">
                      {/* Cover Image or Gradient */}
                      {post.coverImage ? (
                        <div className="relative h-48 w-full overflow-hidden">
                          <img
                            src={post.coverImage}
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
                              {post.title.charAt(0)}
                            </span>
                          </div>
                        </div>
                      )}

                      <CardHeader>
                        {post.publishedAt && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Calendar
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            <time dateTime={post.publishedAt.toISOString()}>
                              {formatDate(post.publishedAt.toISOString())}
                            </time>
                          </span>
                        )}
                        <CardTitle className="mt-2 group-hover:text-accent transition-colors duration-200">
                          {post.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1">
                        <CardDescription className="line-clamp-3">
                          {post.excerpt ?? ""}
                        </CardDescription>
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
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
