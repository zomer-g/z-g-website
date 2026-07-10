import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpLeft,
  Puzzle,
  Database,
  History,
  Calendar,
  Network,
  ExternalLink,
  Code2,
  Search,
  BookOpen,
  Globe,
  Scale,
  BarChart3,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { getPageContent } from "@/lib/content";
import type { LetzPageContent, LeamSiteItem } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "לץ — סדרת תוספי הדפדפן | זומר עורך דין",
  description:
    "סדרת תוספי דפדפן שמורידים מידע ומסמכים ציבוריים בלחיצה: לץ המשפט (נט המשפט), לץ הממשל (אתרי ממשלה) ולץ הלמ״ס. הכול מקומי בדפדפן, ללא שרת ביניים.",
  openGraph: {
    title: "לץ — סדרת תוספי הדפדפן",
    description:
      "שלושה תוספי דפדפן שהופכים מידע ומסמכים ציבוריים לקבצים מסודרים בלחיצה אחת.",
    type: "website",
  },
};

/* ─── Icon resolver ───────────────────────────────────────────────────
 *
 * Icons referenced by name from CMS-stored content. Falls back to Puzzle
 * (the family icon) if an unknown name slips through so the page never
 * crashes.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Puzzle,
  Database,
  History,
  Calendar,
  Network,
  Code2,
  Search,
  BookOpen,
  Globe,
  Scale,
  BarChart3,
  Newspaper,
  ExternalLink,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Puzzle;
}

/* ─── Card ───────────────────────────────────────────────────────────── */
//
// The parent component resolves `Icon` from the CMS icon name and passes
// it down as a prop (see the leam page for why destructuring sidesteps the
// react-hooks/static-components lint heuristic).

function ExtensionCard({
  site,
  Icon,
  ctaLabel,
}: {
  site: LeamSiteItem;
  Icon: LucideIcon;
  ctaLabel: string;
}) {
  const external = site.url.startsWith("http");
  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl",
        "border border-white/15 bg-white/[0.05] backdrop-blur-sm",
        "transition-all duration-300",
        "hover:border-accent/50 hover:bg-white/[0.08]",
        "focus-within:border-accent/60",
      )}
    >
      {/* Glow halo behind the icon — pure decoration. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full",
          "bg-accent/10 blur-3xl",
          "transition-opacity duration-500",
          "opacity-50 group-hover:opacity-90",
        )}
      />

      {/* Top-right ordinal — decorative mono digit */}
      <div
        aria-hidden="true"
        className="absolute end-5 top-5 z-10 font-mono text-xs tracking-widest text-accent-light"
      >
        {site.index}
      </div>

      <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-8">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-xl",
            "border border-accent/40 bg-accent/15 text-accent-light",
            "shadow-[0_0_24px_-8px_var(--accent)] transition-transform duration-300",
            "group-hover:scale-105",
          )}
        >
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-2xl font-bold leading-snug text-white">
            {site.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-accent-light">
            {site.tagline}
          </p>
        </div>

        {/* Domain bar — terminal-style accent on a Latin string */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg",
            "border border-white/20 bg-black/40 px-3 py-2",
            "font-mono text-xs text-white",
          )}
        >
          <span className="text-accent-light" aria-hidden="true">
            ▸
          </span>
          <span className="truncate" dir="ltr" lang="en">
            {site.domain}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-white/90">
          {site.description}
        </p>

        {site.tags.length > 0 ? (
          <ul
            className="flex flex-wrap gap-1.5 list-none p-0 m-0"
            aria-label="תגיות"
          >
            {site.tags.map((tag) => (
              <li
                key={tag}
                className={cn(
                  "inline-block rounded-md border border-white/20 bg-white/[0.08] px-2 py-0.5",
                  "font-mono text-[11px] text-white",
                )}
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="pt-1">
          <Link
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg",
              "border border-accent/60 bg-accent/15 px-4 py-2",
              "text-sm font-semibold text-accent-light transition-all duration-200",
              "hover:border-accent hover:bg-accent hover:text-primary-dark",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
            )}
            aria-label={`${ctaLabel} ${site.name}${external ? " — נפתח בכרטיסייה חדשה" : ""}`}
          >
            <span>{ctaLabel}</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default async function LetzPage() {
  const content = await getPageContent<LetzPageContent>("letz");
  const editHref = "/admin/site-editor/letz";

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <EditableSection editHref={editHref} editLabel="באנר עליון">
        <section
          aria-labelledby="letz-hero-heading"
          className="relative isolate overflow-hidden bg-primary-dark"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #0f2440 0%, #1a365d 50%, #0f2440 100%)",
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 end-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 start-1/4 h-96 w-96 rounded-full bg-primary-light/30 blur-3xl"
          />

          <Container className="relative py-20 sm:py-28">
            {/* Top meta strip */}
            <div className="mx-auto mb-10 flex max-w-fit items-center gap-3 rounded-full border border-white/25 bg-white/[0.08] px-4 py-1.5 backdrop-blur-sm">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
              />
              <span className="text-xs tracking-wider text-white">
                {content.metaStrip}
              </span>
            </div>

            <div className="text-center">
              <h1
                id="letz-hero-heading"
                className={cn(
                  "text-6xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl",
                  "drop-shadow-[0_0_40px_rgba(201,168,76,0.15)]",
                )}
              >
                {content.hero.title}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white sm:text-xl">
                {content.hero.subtitle}
              </p>

              {/* Counter strip */}
              {content.stats.length > 0 ? (
                <dl
                  className={cn(
                    "mx-auto mt-10 grid max-w-2xl gap-px overflow-hidden rounded-xl border border-white/20 bg-white/[0.04]",
                    content.stats.length >= 4
                      ? "grid-cols-2 sm:grid-cols-4"
                      : content.stats.length === 3
                        ? "grid-cols-3"
                        : content.stats.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-1",
                  )}
                  aria-label="נתוני הסדרה"
                >
                  {content.stats.map((stat) => (
                    <div
                      key={stat.v}
                      className="bg-primary-dark/40 px-4 py-4 text-center flex flex-col"
                    >
                      <dt className="order-2 mt-1 text-xs text-white">
                        {stat.v}
                      </dt>
                      <dd className="order-1 font-mono text-2xl font-bold text-accent-light sm:text-3xl">
                        <span aria-hidden={!!stat.srK}>{stat.k}</span>
                        {stat.srK ? (
                          <span className="sr-only">{stat.srK}</span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </Container>
        </section>
      </EditableSection>

      {/* ── Manifesto ────────────────────────────────────────────────── */}
      <EditableSection editHref={editHref} editLabel="הצהרת כוונות">
        <section
          aria-labelledby="letz-manifesto-heading"
          className="relative overflow-hidden bg-primary-dark py-16 sm:py-20"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <div
                aria-hidden="true"
                className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-accent to-transparent"
              />
              <h2
                id="letz-manifesto-heading"
                className="text-2xl font-bold text-white sm:text-3xl"
              >
                {content.manifesto.title}
              </h2>
              <p className="mt-5 text-base leading-loose text-white/95 sm:text-lg">
                {content.manifesto.body}
              </p>
            </div>
          </Container>
        </section>
      </EditableSection>

      {/* ── Extensions grid ─────────────────────────────────────────── */}
      <EditableSection editHref={editHref} editLabel="התוספים">
        <section
          aria-labelledby="letz-portals-heading"
          className="relative overflow-hidden bg-primary py-20 sm:py-24"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute end-0 top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute start-0 bottom-1/4 h-80 w-80 rounded-full bg-primary-light/30 blur-3xl"
          />

          <Container className="relative">
            <div className="mb-12 text-center">
              <p className="text-sm font-semibold tracking-[0.2em] text-accent-light">
                <span aria-hidden="true">{"// "}</span>
                {content.sitesSection.eyebrow}
              </p>
              <h2
                id="letz-portals-heading"
                className="mt-3 text-3xl font-bold text-white sm:text-4xl"
              >
                {content.sitesSection.title}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              {content.sites.map((site) => {
                const Icon = resolveIcon(site.icon);
                return (
                  <ExtensionCard
                    key={site.index + site.name}
                    site={site}
                    Icon={Icon}
                    ctaLabel={content.ctaSiteLabel}
                  />
                );
              })}
            </div>
          </Container>
        </section>
      </EditableSection>

      {/* ── Closing CTA ──────────────────────────────────────────────── */}
      <EditableSection editHref={editHref} editLabel="קריאה לפעולה">
        <section
          aria-labelledby="letz-cta-heading"
          className="relative overflow-hidden bg-primary-dark py-16 sm:py-20"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #c9a84c 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <Container className="relative">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="letz-cta-heading"
                className="text-2xl font-bold text-white sm:text-3xl"
              >
                {content.cta.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/95">
                {content.cta.description}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={content.cta.primaryCtaLink}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3",
                    "text-base font-bold text-primary-dark transition-colors duration-200",
                    "hover:bg-accent-light",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
                  )}
                >
                  <span>{content.cta.primaryCtaText}</span>
                  <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
                {content.cta.secondaryCtaText ? (
                  <Link
                    href={content.cta.secondaryCtaLink}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg",
                      "border border-white/30 bg-white/[0.08] px-6 py-3",
                      "text-base font-semibold text-white transition-all duration-200",
                      "hover:bg-white/[0.15] hover:border-white/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
                    )}
                  >
                    <span>{content.cta.secondaryCtaText}</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </Container>
        </section>
      </EditableSection>
    </PublicLayout>
  );
}
