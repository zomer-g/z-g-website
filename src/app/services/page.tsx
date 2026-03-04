import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
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
import { prisma } from "@/lib/prisma";
import { getIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "תחומי עיסוק | זומר - משרד עורכי דין",
  description:
    "משרד עורכי דין זומר מתמחה בדיני חברות, נדל״ן, ליטיגציה, דיני עבודה, קניין רוחני ודיני מסים. ליווי משפטי מקצועי ומסור.",
};

/* ─── Fetch Services ─── */

async function getServices() {
  try {
    return await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        slug: true,
        title: true,
        description: true,
        icon: true,
      },
    });
  } catch {
    return [];
  }
}

/* ─── Page Component ─── */

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        className="bg-primary py-20 sm:py-28"
        aria-labelledby="services-hero-heading"
      >
        <Container className="text-center">
          <div
            className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent"
            aria-hidden="true"
          />
          <h1
            id="services-hero-heading"
            className="text-4xl font-bold leading-snug tracking-tight text-white sm:text-5xl"
          >
            תחומי עיסוק
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            משרד עורכי דין זומר מציע מגוון רחב של שירותים משפטיים, תוך שמירה על
            מקצועיות, מסירות ויחס אישי לכל לקוח.
          </p>
        </Container>
      </section>

      {/* Services Grid */}
      <section
        className="bg-background py-16 sm:py-24"
        aria-labelledby="services-grid-heading"
      >
        <Container>
          <SectionHeading
            title="השירותים שלנו"
            subtitle="צוות המשרד מתמחה במגוון תחומי משפט ומעניק ליווי משפטי ברמה הגבוהה ביותר."
            id="services-grid-heading"
          />

          {services.length === 0 ? (
            <div className="py-12 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted" />
              <p className="text-muted">תחומי העיסוק יתעדכנו בקרוב.</p>
            </div>
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {services.map((service) => {
                const Icon = getIcon(service.icon ?? "briefcase");
                return (
                  <li key={service.slug}>
                    <Link
                      href={`/services/${service.slug}`}
                      className="group block h-full focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-xl"
                      aria-label={`${service.title} — קרא עוד`}
                    >
                      <Card className="flex h-full flex-col hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200">
                        <CardHeader>
                          <div
                            className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15"
                            aria-hidden="true"
                          >
                            <Icon className="h-6 w-6 text-accent" />
                          </div>
                          <CardTitle className="group-hover:text-accent transition-colors duration-200">
                            {service.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                          <CardDescription>{service.description}</CardDescription>
                        </CardContent>
                        <CardFooter>
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-accent transition-colors duration-200">
                            קרא עוד
                            <ArrowLeft
                              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                              aria-hidden="true"
                            />
                          </span>
                        </CardFooter>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Container>
      </section>

      {/* CTA Section */}
      <section
        className="bg-muted-bg py-16"
        aria-labelledby="services-cta-heading"
      >
        <Container className="text-center">
          <h2
            id="services-cta-heading"
            className="text-2xl font-bold text-primary-dark sm:text-3xl"
          >
            זקוקים לייעוץ משפטי?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            צוות המשרד ישמח לעמוד לרשותכם. צרו קשר לתיאום פגישת ייעוץ ראשונית
            ללא התחייבות.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-lg font-bold text-primary-dark transition-colors duration-200 hover:bg-accent-light focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              צרו קשר עכשיו
            </Link>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
