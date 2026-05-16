import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpLeft,
  Database,
  History,
  Calendar,
  Network,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "לעם — מקבץ אתרים אזרחיים | זומר עורך דין",
  description:
    "ארבעה אתרים אזרחיים שמנגישים מידע ציבורי: מידע לעם, גרסאות לעם, יומן לעם וניגוד עניינים לעם. שקיפות, אחריותיות ונגישות מידע.",
  openGraph: {
    title: "לעם — מקבץ אתרים אזרחיים",
    description:
      "ארבעה אתרים שמנגישים מידע ציבורי, ניהול גרסאות של מאגרי מידע ממשלתיים, יומן פעילות נבחרי ציבור והסדרי ניגוד עניינים.",
    type: "website",
  },
};

/* ─── Portal data ─────────────────────────────────────────────────────────
 *
 * Each portal gets its own ordinal, accent tint, and icon. The accents are
 * derived from the site palette (primary navy + accent gold) so the suite
 * still feels like part of zomer-law's visual language, just with more
 * monospace + glow than the marketing pages.
 */

type Portal = {
  index: string;
  name: string;
  tagline: string;
  description: string;
  domain: string;
  url: string;
  icon: LucideIcon;
  tags: string[];
};

const PORTALS: Portal[] = [
  {
    index: "01",
    name: "מידע לעם",
    tagline: "אתר המידע הפתוח הישראלי",
    description:
      "מערכת שמרכזת אלפי מאגרי מידע מ-49 גופים ציבוריים בישראל ומאפשרת לכל אזרח לחפש, לעיין ולהוריד מידע ממשלתי — מהיסטוריית טיסות ועד רישומי בנייה ירוקה. הבסיס לכל ניתוח ציבורי בלתי-תלוי.",
    domain: "odata.org.il",
    url: "https://www.odata.org.il/",
    icon: Database,
    tags: ["מידע פתוח", "ממשק תכנות פתוח", "49 גופים"],
  },
  {
    index: "02",
    name: "גרסאות לעם",
    tagline: "מעקב גרסאות אחרי מאגרי מידע ממשלתיים",
    description:
      "כלי שמתעד את ההיסטוריה של מאגרי המידע ב-data.gov.il וב-gov.il — כל הוספה, גריעה או שינוי של קובץ. מאפשר לעקוב, להשוות בין גרסאות ולזהות שינויים שקטים בנתונים שמתפרסמים לציבור. שקיפות גם לאורך זמן, לא רק ברגע הפרסום.",
    domain: "over.org.il",
    url: "https://www.over.org.il/",
    icon: History,
    tags: ["השוואת גרסאות", "מאגרים ממשלתיים", "שקיפות לאורך זמן"],
  },
  {
    index: "03",
    name: "יומן לעם",
    tagline: "מעקב אחר פעילות נבחרי ציבור",
    description:
      "כלי שמתעד ומנגיש את יומני הפעילות של נבחרי ציבור בישראל — ישיבות, הצבעות ופעילות שוטפת — ומקשר בין דמויות ציבוריות לבין ציר הזמן. נציגים שנבחרו לשרת את הציבור צריכים להיות אחראים כלפיו.",
    domain: "ocal.org.il",
    url: "https://ocal.org.il/",
    icon: Calendar,
    tags: ["נבחרי ציבור", "ציר זמן", "אחריותיות"],
  },
  {
    index: "04",
    name: "ניגוד עניינים לעם",
    tagline: "מאגר הסדרי ניגוד עניינים של נושאי משרה",
    description:
      "מנוע חיפוש שמרכז את הסדרי ניגוד העניינים של בעלי תפקידים ציבוריים בישראל ומאפשר לבדוק אילו זיקות כלכליות ועסקיות קיימות להם — וגם למפות חזותית את רשת הקשרים שביניהם.",
    domain: "ocoi.org.il",
    url: "https://www.ocoi.org.il/",
    icon: Network,
    tags: ["גרף קשרים", "ניגוד עניינים", "מיפוי קשרים"],
  },
];

/* ─── Card ────────────────────────────────────────────────────────────── */

function PortalCard({ portal }: { portal: Portal }) {
  const Icon = portal.icon;
  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl",
        "border border-white/10 bg-white/[0.03] backdrop-blur-sm",
        "transition-all duration-300",
        "hover:border-accent/40 hover:bg-white/[0.05]",
        "focus-within:border-accent/60",
      )}
    >
      {/* Glow halo behind the icon — pure decoration, sits under content. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full",
          "bg-accent/10 blur-3xl",
          "transition-opacity duration-500",
          "opacity-50 group-hover:opacity-90",
        )}
      />

      {/* Top-right ordinal — mono digit, very techy */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute end-5 top-5 z-10",
          "font-mono text-xs tracking-widest text-accent/70",
        )}
      >
        {portal.index}
      </div>

      <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-8">
        {/* Icon */}
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-xl",
            "border border-accent/30 bg-accent/10 text-accent-light",
            "shadow-[0_0_24px_-8px_var(--accent)] transition-transform duration-300",
            "group-hover:scale-105",
          )}
        >
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        {/* Name + tagline */}
        <div>
          <h3 className="text-2xl font-bold leading-snug text-white">
            {portal.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-accent-light">
            {portal.tagline}
          </p>
        </div>

        {/* Domain bar — אזור הכתובת של האתר */}
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
            {portal.domain}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-white/90">
          {portal.description}
        </p>

        {/* Tags */}
        <ul
          className="flex flex-wrap gap-1.5 list-none p-0 m-0"
          aria-label="תגיות"
        >
          {portal.tags.map((tag) => (
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

        {/* CTA */}
        <div className="pt-1">
          <Link
            href={portal.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg",
              "border border-accent/60 bg-accent/15 px-4 py-2",
              "text-sm font-semibold text-accent-light transition-all duration-200",
              "hover:border-accent hover:bg-accent hover:text-primary-dark",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
            )}
            aria-label={`כניסה לאתר ${portal.name} — נפתח בכרטיסייה חדשה`}
          >
            <span>כניסה לאתר</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function LeamPage() {
  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────
       *
       * Dark navy hero with two layered glow blobs + a faint dot grid.
       * The "לעם" wordmark uses mono digits for the version-style badge
       * and Heebo (site default) for the Hebrew. Sub-nav-style top strip
       * shows the domain count for an immediate "this is real" feel.
       */}
      <section
        aria-labelledby="leam-hero-heading"
        className="relative isolate overflow-hidden bg-primary-dark"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0f2440 0%, #1a365d 50%, #0f2440 100%)",
        }}
      >
        {/* Decorative dot grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Two soft accent glows */}
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
              טכנולוגיה אזרחית · גרסה 1.0
            </span>
          </div>

          <div className="text-center">
            <h1
              id="leam-hero-heading"
              className={cn(
                "text-6xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl",
                "drop-shadow-[0_0_40px_rgba(201,168,76,0.15)]",
              )}
            >
              לעם
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white sm:text-xl">
              מקבץ של ארבעה אתרים אזרחיים שמנגישים מידע ציבורי בישראל —
              <br className="hidden sm:block" />
              מאגרי מידע, גרסאות, יומני נבחרים והסדרי ניגוד עניינים.
            </p>

            {/* Counter strip */}
            <dl
              className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/20 bg-white/[0.04] sm:grid-cols-4"
              aria-label="נתוני המקבץ"
            >
              {[
                { k: "04", v: "אתרים" },
                { k: "49+", v: "גופים ציבוריים" },
                { k: "∞", v: "מאגרי מידע", srK: "ללא הגבלה" },
                { k: "100%", v: "קוד פתוח" },
              ].map((stat) => (
                <div
                  key={stat.v}
                  className="bg-primary-dark/40 px-4 py-4 text-center flex flex-col"
                >
                  <dt className="order-2 mt-1 text-xs text-white">{stat.v}</dt>
                  <dd className="order-1 font-mono text-2xl font-bold text-accent-light sm:text-3xl">
                    <span aria-hidden={!!stat.srK}>{stat.k}</span>
                    {stat.srK ? <span className="sr-only">{stat.srK}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* ── Manifesto strip ───────────────────────────────────────────── */}
      <section
        aria-labelledby="leam-manifesto-heading"
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
              id="leam-manifesto-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              שקיפות היא תנאי לדמוקרטיה
            </h2>
            <p className="mt-5 text-base leading-loose text-white/95 sm:text-lg">
              ארבעת האתרים שלהלן נבנו מתוך תפיסה אחת: שמידע ציבורי הוא קודם
              כל שלנו. כל אתר מטפל בשכבה אחרת של הפער בין המידע שגופי הציבור
              מחזיקים לבין המידע שאזרחים יכולים בפועל להגיע אליו, להבין ולהשתמש
              בו — מהקובץ הגולמי ועד מפת הקשרים בין נושאי המשרה.
            </p>
          </div>
        </Container>
      </section>

      {/* ── Sites grid ────────────────────────────────────────────────── */}
      <section
        aria-labelledby="leam-portals-heading"
        className="relative overflow-hidden bg-primary py-20 sm:py-24"
      >
        {/* Subtle background mesh */}
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
          {/* Section header — split label + heading like a doc page */}
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-accent-light">
              <span aria-hidden="true">{"// "}</span>
              האתרים
            </p>
            <h2
              id="leam-portals-heading"
              className="mt-3 text-3xl font-bold text-white sm:text-4xl"
            >
              ארבע שכבות של שקיפות
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            {PORTALS.map((portal) => (
              <PortalCard key={portal.index} portal={portal} />
            ))}
          </div>
        </Container>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="leam-cta-heading"
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
              id="leam-cta-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              רוצים לשתף פעולה?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/95">
              אתרי לעם פתוחים לשיתופי פעולה עם חוקרים, עיתונאים, ארגוני חברה
              אזרחית ויוצרים עצמאיים. אם יש לכם רעיון להמשך — כתבו לנו.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3",
                  "text-base font-bold text-primary-dark transition-colors duration-200",
                  "hover:bg-accent-light",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
                )}
              >
                <span>צרו קשר</span>
                <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/projects"
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg",
                  "border border-white/30 bg-white/[0.08] px-6 py-3",
                  "text-base font-semibold text-white transition-all duration-200",
                  "hover:bg-white/[0.15] hover:border-white/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
                )}
              >
                <span>כל המיזמים</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
