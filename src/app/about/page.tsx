import type { Metadata } from "next";
import { Users, ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPageContent } from "@/lib/content";
import { getIcon } from "@/lib/icons";
import type { AboutPageContent } from "@/types/content";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "אודות המשרד",
  description:
    "אודות משרד עורכי דין זומר - הכירו את הצוות, הניסיון והערכים שלנו. ליווי משפטי מקצועי עם מחויבות למצוינות.",
};

/* ─── Page ─── */

export default async function AboutPage() {
  const content = await getPageContent<AboutPageContent>("about");

  return (
    <PublicLayout>
      {/* ── Hero Banner ── */}
      <section
        aria-labelledby="about-hero-heading"
        className="relative overflow-hidden bg-primary"
      >
        <div
          className="absolute inset-0 bg-gradient-to-bl from-primary via-primary-dark to-primary-dark/95"
          aria-hidden="true"
        />
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute top-0 left-0 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary-light/20 blur-3xl" />
        </div>

        <Container className="relative py-20 sm:py-24 lg:py-28">
          <div className="mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
          <h1
            id="about-hero-heading"
            className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            {content.hero.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            {content.hero.subtitle}
          </p>
        </Container>

        <div
          className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-l from-accent via-accent/50 to-transparent"
          aria-hidden="true"
        />
      </section>

      {/* ── Firm Story ── */}
      <section aria-labelledby="firm-story-heading" className="py-20 lg:py-28">
        <Container narrow>
          <SectionHeading
            id="firm-story-heading"
            title={content.firmStory.title}
            subtitle={content.firmStory.subtitle}
            align="start"
          />

          <div className="prose-rtl space-y-6 text-lg leading-relaxed text-muted">
            {content.firmStory.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Attorney Profile ── */}
      <section
        aria-labelledby="attorney-heading"
        className="bg-muted-bg py-20 lg:py-28"
      >
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative" aria-hidden="true">
              <div className="aspect-[3/4] max-w-sm mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-xl lg:mx-0">
                <div className="absolute -top-3 -right-3 h-20 w-20 rounded-xl bg-accent/20" />
                <div className="absolute -bottom-3 -left-3 h-28 w-28 rounded-xl bg-accent/15" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users className="h-20 w-20 text-white/15" />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
              <h2
                id="attorney-heading"
                className="text-3xl font-bold leading-snug tracking-tight text-primary-dark sm:text-4xl"
              >
                {content.attorney.name}
              </h2>
              <p className="mt-2 text-lg font-semibold text-accent">
                {content.attorney.role}
              </p>

              <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
                {content.attorney.bio.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                {content.attorney.credentials.map((cred, i) => {
                  const CredIcon = getIcon(cred.icon);
                  return (
                    <div key={i} className="flex items-center gap-3 text-foreground">
                      <CredIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                      <span className="text-base">{cred.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Values ── */}
      <section aria-labelledby="values-heading" className="py-20 lg:py-28">
        <Container>
          <SectionHeading
            id="values-heading"
            title={content.values.title}
            subtitle={content.values.subtitle}
          />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {content.values.items.map((value) => {
              const ValueIcon = getIcon(value.icon);
              return (
                <Card key={value.title} className="text-center">
                  <CardHeader className="items-center">
                    <div
                      className={cn(
                        "mb-4 inline-flex h-14 w-14 items-center justify-center",
                        "rounded-full bg-accent/10 text-accent"
                      )}
                    >
                      <ValueIcon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <CardTitle>{value.title}</CardTitle>
                    <CardDescription className="text-center">
                      {value.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ── CTA ── */}
      <section
        aria-labelledby="about-cta-heading"
        className="relative overflow-hidden bg-primary py-16 lg:py-20"
      >
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary-dark/80 to-primary" />
          <div className="absolute top-0 left-1/3 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <Container className="relative text-center">
          <h2
            id="about-cta-heading"
            className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl"
          >
            {content.cta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/80">
            {content.cta.description}
          </p>
          <div className="mt-8">
            <Button href={content.cta.ctaLink} variant="accent" size="lg">
              {content.cta.ctaText}
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
