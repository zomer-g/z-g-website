import type { Metadata } from "next";
import { ExternalLink, Database, Calendar, Search, Code2, ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "מיזמים",
  description:
    'מיזמים אקטיביסטיים בממשקים של דאטה, משפט וטכנולוגיה. עו"ד גיא זומר — שקיפות, נגישות מידע ואחריותיות ציבורית.',
  openGraph: {
    title: 'מיזמים | עו"ד זומר',
    description:
      "מיזמים אקטיביסטיים בממשקים של דאטה, משפט וטכנולוגיה.",
  },
};

/* ─── Project Data ─── */

interface Project {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly url: string;
  readonly icon: typeof Database;
  readonly tags: readonly string[];
}

const PROJECTS: readonly Project[] = [
  {
    slug: "odata",
    title: "מידע לעם",
    subtitle: "פורטל המידע הפתוח הישראלי",
    description:
      "פלטפורמה שמנגישה אלפי מאגרי מידע ממשלתיים לציבור. הפרויקט מרכז נתונים מ-49 גופים ציבוריים ומאפשר לכל אזרח לחפש, לעיין ולהוריד מידע ממשלתי — מהיסטוריית טיסות ועד רישומי בנייה ירוקה. שקיפות מידע היא תנאי הכרחי לדמוקרטיה בריאה, והפרויקט הזה מבטיח שהנתונים שלנו באמת שלנו.",
    url: "https://www.odata.org.il/",
    icon: Database,
    tags: ["מידע פתוח", "שקיפות ממשלתית", "CKAN"],
  },
  {
    slug: "ocal",
    title: "יומן לעם",
    subtitle: "מעקב אחר פעילות נבחרי ציבור",
    description:
      "כלי ציבורי שמאפשר מעקב שוטף אחר יומני הפעילות של נבחרי ציבור בישראל. הפרויקט נולד מתוך תפיסה פשוטה: נציגים שנבחרו לשרת את הציבור צריכים להיות אחראים כלפיו. הפלטפורמה מתעדת ומנגישה מידע על ישיבות, הצבעות ופעילות שוטפת — וכך מחזקת את האחריותיות הדמוקרטית.",
    url: "https://ocal.org.il/",
    icon: Calendar,
    tags: ["אחריותיות", "נבחרי ציבור", "שקיפות"],
  },
  {
    slug: "ocoi",
    title: "ניגוד עניינים לעם",
    subtitle: "מאגר הסדרי ניגוד עניינים של נושאי משרה",
    description:
      "מנוע חיפוש שמרכז ומנגיש את הסדרי ניגוד העניינים של בעלי תפקידים ציבוריים בישראל. הפלטפורמה מאפשרת לכל אזרח לבדוק אילו זיקות כלכליות ועסקיות קיימות לנושאי המשרה שמקבלים עבורו החלטות — ולמפות את רשת הקשרים ביניהם באמצעות כלי ויזואליזציה אינטראקטיבי.",
    url: "https://www.ocoi.org.il/",
    icon: Search,
    tags: ["ניגוד עניינים", "ויזואליזציה", "מיפוי קשרים"],
  },
] as const;

/* ─── Page ─── */

export default function ProjectsPage() {
  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section
        aria-labelledby="projects-hero-heading"
        className="relative overflow-hidden bg-primary"
      >
        {/* Decorative grid overlay — tech element */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary via-primary-dark to-primary-dark/95" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute right-10 bottom-10 h-56 w-56 rounded-full bg-primary-light/15 blur-3xl" />
        </div>

        <Container className="relative py-20 sm:py-24 lg:py-28">
          <div className="text-center">
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20"
              aria-hidden="true"
            >
              <Code2 className="h-7 w-7 text-accent" />
            </div>
            <div
              className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent"
              aria-hidden="true"
            />
            <h1
              id="projects-hero-heading"
              className={cn(
                "text-3xl font-bold leading-snug tracking-tight text-white",
                "sm:text-4xl lg:text-5xl",
              )}
            >
              מיזמים
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              פרויקטים אקטיביסטיים בממשקים של דאטה, משפט וטכנולוגיה — כי שקיפות
              ונגישות מידע הם תנאי בסיסי לדמוקרטיה.
            </p>
          </div>
        </Container>
      </section>

      {/* ── Projects Grid ── */}
      <section
        aria-labelledby="projects-list-heading"
        className="relative py-16 sm:py-20"
      >
        {/* Subtle dot-grid background — tech element */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <Container className="relative">
          <h2 id="projects-list-heading" className="sr-only">
            רשימת מיזמים
          </h2>

          <div className="space-y-10">
            {PROJECTS.map((project, index) => {
              const Icon = project.icon;
              return (
                <Card
                  key={project.slug}
                  className={cn(
                    "group relative overflow-hidden border border-border/60 bg-white transition-shadow duration-300",
                    "hover:shadow-lg hover:shadow-primary/5",
                  )}
                >
                  {/* Accent top border */}
                  <div
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-accent via-accent-light to-accent/60"
                    aria-hidden="true"
                  />

                  <CardContent className="p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
                      {/* Icon + Number */}
                      <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-center lg:gap-2">
                        <div
                          className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-xl",
                            "bg-primary/5 text-primary transition-colors duration-300",
                            "group-hover:bg-accent/10 group-hover:text-accent",
                          )}
                        >
                          <Icon className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <span
                          className="font-mono text-sm font-semibold text-muted/50"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-bold leading-snug text-primary-dark">
                          {project.title}
                        </h3>
                        <p className="mt-1 text-base font-medium text-accent">
                          {project.subtitle}
                        </p>
                        <p className="mt-4 text-base leading-relaxed text-foreground/80">
                          {project.description}
                        </p>

                        {/* Tags */}
                        <div
                          className="mt-5 flex flex-wrap gap-2"
                          aria-label="תגיות"
                        >
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                "inline-block rounded-full border border-primary/10 bg-primary/5 px-3 py-1",
                                "font-mono text-xs font-medium text-primary-dark/70",
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Link */}
                        <div className="mt-6">
                          <Link
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-5 py-2.5",
                              "text-sm font-bold text-primary-dark transition-all duration-200",
                              "hover:border-accent hover:bg-accent hover:text-primary-dark",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                            )}
                          >
                            <span>לאתר הפרויקט</span>
                            <ExternalLink
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ── CTA ── */}
      <section
        aria-labelledby="projects-cta-heading"
        className="bg-primary py-14 sm:py-16"
      >
        <Container>
          <div className="text-center">
            <h2
              id="projects-cta-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              רוצים לשתף פעולה?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/80">
              יש לכם רעיון לפרויקט בתחומי הדאטה, המשפט והטכנולוגיה? אשמח לשמוע.
            </p>
            <div className="mt-8">
              <Link
                href="/contact"
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3",
                  "text-base font-bold text-primary-dark transition-colors duration-200",
                  "hover:bg-accent-light",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                )}
              >
                <span>צרו קשר</span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
