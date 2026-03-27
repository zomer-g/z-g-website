import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getIcon } from "@/lib/icons";
import { TipTapRenderer } from "@/components/tiptap-renderer";
import { getPageContent } from "@/lib/content";
import type { HomePageContent, ServiceDetailContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

/* ─── Fetch Service ─── */

async function getService(slug: string) {
  try {
    return await prisma.service.findUnique({
      where: { slug },
    });
  } catch {
    return null;
  }
}

/* ─── Fetch Related Services ─── */

async function getRelatedServices(currentSlug: string) {
  try {
    return await prisma.service.findMany({
      where: {
        isActive: true,
        slug: { not: currentSlug },
      },
      orderBy: { order: "asc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        icon: true,
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service || !service.isActive) {
    return { title: "שירות לא נמצא | עו\"ד זומר" };
  }

  return {
    title: `${service.seoTitle || service.title} | תחומי עיסוק | עו"ד זומר`,
    description: service.seoDesc || service.description,
  };
}

/* ─── Page Component ─── */

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service || !service.isActive) {
    notFound();
  }

  const Icon = getIcon(service.icon ?? "briefcase");
  const [relatedServices, homeContent, cms] = await Promise.all([
    getRelatedServices(slug),
    getPageContent<HomePageContent>("home"),
    getPageContent<ServiceDetailContent>("service-detail"),
  ]);
  const cta = homeContent.cta;

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
                href="/services"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                {cms.strings.breadcrumbServices}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <span className="font-semibold text-primary-dark" aria-current="page">
                {service.title}
              </span>
            </li>
          </ol>
        </Container>
      </nav>

      {/* Hero */}
      <section
        className="bg-primary py-16 sm:py-24"
        aria-labelledby="service-hero-heading"
      >
        <Container>
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20"
              aria-hidden="true"
            >
              <Icon className="h-7 w-7 text-accent" />
            </div>
            <h1
              id="service-hero-heading"
              className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {service.title}
            </h1>
          </div>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            {service.description}
          </p>
        </Container>
      </section>

      {/* Main Content + Sidebar */}
      <EditableSection editHref={`/admin/services?edit=${service.slug}`} editLabel="ערוך שירות">
      <section className="bg-background py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Main Content */}
            <article className="lg:col-span-2">
              <div className="prose-rtl">
                <TipTapRenderer content={service.content as Record<string, unknown>} />
              </div>
            </article>

            {/* Sidebar */}
            <aside aria-label="מידע נוסף" className="space-y-8">
              {/* CTA Card — editable from admin (דף הבית → CTA) */}
              <Card className="border-accent/30 bg-primary text-white">
                <CardContent className="p-6">
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20"
                    aria-hidden="true"
                  >
                    <Phone className="h-6 w-6 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {cta.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {cta.description}
                  </p>
                  <Link
                    href={cta.ctaLink}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-bold text-primary-dark transition-colors duration-200 hover:bg-accent-light focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    {cta.ctaText}
                  </Link>
                </CardContent>
              </Card>

              {/* Related Services */}
              {relatedServices.length > 0 && (
                <div>
                  <h2 className="mb-4 text-lg font-bold text-primary-dark">
                    {cms.strings.relatedServicesTitle}
                  </h2>
                  <ul role="list" className="space-y-3">
                    {relatedServices.map((related) => {
                      const RelatedIcon = getIcon(related.icon ?? "briefcase");
                      return (
                        <li key={related.slug}>
                          <Link
                            href={`/services/${related.slug}`}
                            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-accent/30 hover:shadow-sm focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15"
                              aria-hidden="true"
                            >
                              <RelatedIcon className="h-5 w-5 text-accent" />
                            </div>
                            <span className="text-sm font-semibold text-primary-dark group-hover:text-accent transition-colors duration-200">
                              {related.title}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </section>
      </EditableSection>
    </PublicLayout>
  );
}
