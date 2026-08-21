// No "use client" and no animation library. The entrance is two CSS
// keyframes (.hero-rise in globals.css); nothing here needs state, effects or
// event handlers, so the hero renders entirely on the server and contributes
// no JavaScript to the landing page at all.
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { HomeHeroContent } from "@/types/content";

interface HeroProps {
  content?: HomeHeroContent;
}

export default function Hero({ content }: HeroProps) {
  const title = content?.title ?? "ייצוג משפטי";
  const titleAccent = content?.titleAccent ?? "ברמה הגבוהה ביותר";
  const description =
    content?.description ??
    "עו\"ד זומר מספק ליווי משפטי מקצועי ומקיף לחברות, עסקים ויחידים. עם ניסיון עשיר וגישה אישית, מחויבות מלאה להשגת התוצאות הטובות ביותר עבור כל לקוח.";
  const ctaText = content?.ctaText ?? "לייעוץ ראשוני";
  const ctaLink = content?.ctaLink ?? "/contact";
  const secondaryCtaText = content?.secondaryCtaText ?? "תחומי העיסוק";
  const secondaryCtaLink = content?.secondaryCtaLink ?? "/services";

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-primary"
    >
      <div
        className="absolute inset-0 bg-gradient-to-bl from-primary via-primary-dark to-primary-dark/95"
        aria-hidden="true"
      />
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-light/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-64 w-64 -translate-y-1/2 rounded-full bg-accent/3 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8 lg:py-44">
        <div className="max-w-3xl">
          <div
            className="hero-rise mb-8 h-1 w-20 rounded-full bg-accent"
            aria-hidden="true"
          />

          {/* Deliberately not animated. This h1 is the page's LCP element,
              and fading it in from opacity 0 meant the browser could not
              report Largest Contentful Paint until the animation finished:
              0.15s delay + 0.7s duration on top of TTFB measured as LCP 1.6s
              on desktop and 5.0s on mobile, against a first paint of 0.5s and
              1.2s. Painting it immediately is worth more than the entrance.
              The same goes for the description directly below it. */}
          <h1
            id="hero-heading"
            className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {title}
            <br />
            <span className="text-accent">{titleAccent}</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            {description}
          </p>

          <div className="hero-rise hero-rise--delayed mt-10 flex flex-wrap items-center gap-4">
            <Button href={ctaLink} variant="accent" size="lg">
              {ctaText}
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button href={secondaryCtaLink} variant="secondary" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
              {secondaryCtaText}
            </Button>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-l from-accent via-accent/50 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
