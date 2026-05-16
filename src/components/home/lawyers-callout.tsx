import { ArrowLeft, Scale } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HomeLawyersCallout } from "@/types/content";

interface LawyersCalloutProps {
  content: HomeLawyersCallout;
}

export default function LawyersCallout({ content }: LawyersCalloutProps) {
  if (!content?.enabled) return null;

  return (
    <section
      aria-labelledby="lawyers-callout-heading"
      className="bg-primary-dark py-20 lg:py-28"
    >
      <Container>
        <div className="mx-auto max-w-3xl">
          <div
            className={cn(
              "rounded-2xl border border-white/10 bg-white/[0.04] p-8 sm:p-12",
              "shadow-2xl backdrop-blur-sm"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </div>
              {content.eyebrow && (
                <span className="text-sm font-semibold uppercase tracking-wider text-accent">
                  {content.eyebrow}
                </span>
              )}
            </div>

            <h2
              id="lawyers-callout-heading"
              className="mt-6 text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl"
            >
              {content.title}
            </h2>

            <div className="mt-6 space-y-4 text-lg leading-relaxed text-white/80">
              {content.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {content.ctaText && content.ctaLink && (
              <div className="mt-10">
                <Button href={content.ctaLink} variant="accent" size="md">
                  {content.ctaText}
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
