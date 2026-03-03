import type { Metadata } from "next";
import Link from "next/link";
import {
  Scale,
  Building2,
  Gavel,
  FileText,
  Shield,
  Briefcase,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Hero from "@/components/home/hero";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "עמוד הבית",
  description:
    "משרד עורכי דין זומר - ייצוג משפטי מקצועי ברמה הגבוהה ביותר. מומחיות בדיני חברות, נדל\"ן, ליטיגציה ועוד. ייעוץ ראשוני ללא התחייבות.",
};

/* ─── Data ─── */

const SERVICES = [
  {
    icon: Scale,
    title: "דיני חברות ומסחרי",
    description:
      "ייעוץ משפטי מקיף לחברות בכל שלבי הפעילות העסקית, כולל הקמה, מיזוגים ורכישות.",
    href: "/services",
  },
  {
    icon: Building2,
    title: "נדל\"ן ומקרקעין",
    description:
      "ליווי עסקאות נדל\"ן מורכבות, תכנון ובנייה, ורישום זכויות במקרקעין.",
    href: "/services",
  },
  {
    icon: Gavel,
    title: "ליטיגציה ויישוב סכסוכים",
    description:
      "ייצוג בבתי משפט ובערכאות שיפוטיות בתיקים אזרחיים, מסחריים ומנהליים.",
    href: "/services",
  },
  {
    icon: FileText,
    title: "חוזים והסכמים",
    description:
      "ניסוח, עריכה ובחינת חוזים מסחריים, הסכמי שיתוף פעולה והסכמי עבודה.",
    href: "/services",
  },
  {
    icon: Shield,
    title: "הגנת פרטיות ורגולציה",
    description:
      "ייעוץ בתחום הגנת הפרטיות, ציות לרגולציה ודיני הגנת המידע.",
    href: "/services",
  },
  {
    icon: Briefcase,
    title: "דיני עבודה",
    description:
      "ייצוג מעסיקים ועובדים בכל תחומי דיני העבודה, כולל הסכמים קיבוציים ותביעות.",
    href: "/services",
  },
] as const;

const ARTICLES = [
  {
    title: "שינויים בחוק החברות: מה צריך לדעת בשנת 2025",
    excerpt:
      "סקירה מקיפה של התיקונים האחרונים בחוק החברות והשפעתם על ניהול חברות בישראל.",
    date: "15 בינואר 2025",
    href: "/articles",
  },
  {
    title: "זכויות רוכשי דירות: המדריך המלא",
    excerpt:
      "כל מה שצריך לדעת על זכויות הרוכש בעסקת נדל\"ן, מהחתימה ועד קבלת המפתח.",
    date: "3 בפברואר 2025",
    href: "/articles",
  },
  {
    title: "גישור עסקי: חלופה יעילה לליטיגציה",
    excerpt:
      "כיצד הליך הגישור יכול לחסוך לעסקים זמן וכסף ביישוב סכסוכים מסחריים.",
    date: "20 בפברואר 2025",
    href: "/articles",
  },
] as const;

/* ─── Page ─── */

export default function HomePage() {
  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <Hero />

      {/* ── Services Preview ── */}
      <section aria-labelledby="services-heading" className="py-20 lg:py-28">
        <Container>
          <SectionHeading
            id="services-heading"
            title="תחומי העיסוק שלנו"
            subtitle="המשרד מתמחה במגוון רחב של תחומי משפט ומעניק שירות משפטי מקצועי ומקיף"
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.title}
                  href={service.href}
                  className="group block"
                >
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-accent/30">
                    <CardHeader>
                      <div
                        className={cn(
                          "mb-4 inline-flex h-12 w-12 items-center justify-center",
                          "rounded-lg bg-primary/5 text-primary",
                          "transition-colors duration-300 group-hover:bg-accent/10 group-hover:text-accent"
                        )}
                      >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <CardTitle>{service.title}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-semibold text-primary",
                          "transition-colors duration-200 group-hover:text-accent"
                        )}
                      >
                        למידע נוסף
                        <ArrowLeft
                          className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ── About Preview ── */}
      <section
        aria-labelledby="about-preview-heading"
        className="bg-muted-bg py-20 lg:py-28"
      >
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Text side */}
            <div>
              <div
                className="mb-4 h-1 w-16 rounded-full bg-accent"
                aria-hidden="true"
              />
              <h2
                id="about-preview-heading"
                className="text-3xl font-bold leading-snug tracking-tight text-primary-dark sm:text-4xl"
              >
                משרד עורכי דין עם חזון
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                משרד עורכי דין זומר, בהנהלת עורך הדין גיא זומר, פועל מתוך מחויבות
                עמוקה למצוינות מקצועית ולשירות אישי. המשרד מלווה חברות מובילות,
                יזמים ולקוחות פרטיים בכל תחומי המשפט המסחרי והאזרחי.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                עם ניסיון של שנים בתחום, המשרד מציע גישה מקצועית ויסודית לכל
                תיק, תוך שמירה על סטנדרטים גבוהים של יושרה ואמינות.
              </p>
              <div className="mt-8">
                <Button href="/about" variant="primary" size="md">
                  עוד על המשרד
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Decorative side */}
            <div className="relative hidden lg:block" aria-hidden="true">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-xl">
                {/* Decorative accent elements */}
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-xl bg-accent/20" />
                <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-xl bg-accent/15" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Scale className="mx-auto h-16 w-16 text-white/20" />
                    <div className="mt-4 h-0.5 w-24 mx-auto bg-accent/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Articles Preview ── */}
      <section aria-labelledby="articles-heading" className="py-20 lg:py-28">
        <Container>
          <SectionHeading
            id="articles-heading"
            title="מאמרים ועדכונים"
            subtitle="מאמרים מקצועיים ועדכונים משפטיים בתחומי העיסוק של המשרד"
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {ARTICLES.map((article) => (
              <Link
                key={article.title}
                href={article.href}
                className="group block"
              >
                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  {/* Placeholder image area */}
                  <div className="h-48 rounded-t-xl bg-gradient-to-br from-primary/10 to-primary/5" />
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <time>{article.date}</time>
                    </div>
                    <CardTitle
                      className={cn(
                        "transition-colors duration-200 group-hover:text-accent"
                      )}
                    >
                      {article.title}
                    </CardTitle>
                    <CardDescription>{article.excerpt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm font-semibold text-primary",
                        "transition-colors duration-200 group-hover:text-accent"
                      )}
                    >
                      קראו עוד
                      <ArrowLeft
                        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button href="/articles" variant="secondary" size="md">
              לכל המאמרים
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Container>
      </section>

      {/* ── CTA Section ── */}
      <section
        aria-labelledby="cta-heading"
        className="relative overflow-hidden bg-primary py-20 lg:py-28"
      >
        {/* Decorative background */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary-dark/80 to-primary" />
          <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent/3 blur-3xl" />
        </div>

        <Container className="relative text-center">
          <div
            className="mx-auto mb-6 h-1 w-16 rounded-full bg-accent"
            aria-hidden="true"
          />
          <h2
            id="cta-heading"
            className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl"
          >
            ייעוץ ראשוני ללא התחייבות
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            נשמח לשמוע על הצרכים המשפטיים שלכם ולהציע את הפתרון המתאים ביותר.
            צרו קשר עוד היום לשיחת ייעוץ ראשונית.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="/contact" variant="accent" size="lg">
              צרו קשר עכשיו
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              href="tel:+972-3-000-0000"
              variant="secondary"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              03-000-0000
            </Button>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
