import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import IntakeForm from "@/components/forms/intake-form";
import { cn } from "@/lib/utils";

/* ---- Metadata ---- */

export const metadata: Metadata = {
  title: "צור קשר",
  description:
    "צרו קשר עם משרד עורכי דין זומר לקביעת פגישת ייעוץ ראשונית. טלפון, אימייל וטופס יצירת קשר מקוון.",
  openGraph: {
    title: "צור קשר | זומר - משרד עורכי דין",
    description:
      "צרו קשר עם משרד עורכי דין זומר לקביעת פגישת ייעוץ ראשונית.",
  },
};

/* ---- Contact Info Data ---- */

interface ContactInfoItem {
  readonly icon: React.ElementType;
  readonly label: string;
  readonly value: string;
  readonly href?: string;
  readonly dir?: "ltr" | "rtl";
  readonly ariaLabel?: string;
}

const CONTACT_INFO: readonly ContactInfoItem[] = [
  {
    icon: Phone,
    label: "טלפון",
    value: "03-000-0000",
    href: "tel:+972-3-000-0000",
    dir: "ltr",
    ariaLabel: "התקשרו אלינו: 03-000-0000",
  },
  {
    icon: Mail,
    label: "אימייל",
    value: "info@zomer-law.co.il",
    href: "mailto:info@zomer-law.co.il",
    dir: "ltr",
    ariaLabel: "שלחו אימייל: info@zomer-law.co.il",
  },
  {
    icon: MapPin,
    label: "כתובת",
    value: "רחוב הברזל 30, תל אביב",
  },
  {
    icon: Clock,
    label: "שעות פעילות",
    value: "א׳-ה׳: 08:30-18:00",
  },
] as const;

/* ---- Page Component ---- */

export default function ContactPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        aria-labelledby="contact-hero-heading"
        className="bg-primary py-16 sm:py-20"
      >
        <Container>
          <div className="text-center">
            <h1
              id="contact-hero-heading"
              className={cn(
                "text-3xl font-bold leading-snug tracking-tight text-white",
                "sm:text-4xl lg:text-5xl",
              )}
            >
              צור קשר
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              נשמח לשמוע מכם. מלאו את הטופס או צרו עמנו קשר באחת מהדרכים
              הבאות ונחזור אליכם בהקדם.
            </p>
          </div>
        </Container>
      </section>

      {/* Contact Form & Info Section */}
      <section aria-labelledby="contact-form-heading" className="py-16 sm:py-20">
        <Container>
          <h2 id="contact-form-heading" className="sr-only">
            טופס יצירת קשר ופרטי התקשרות
          </h2>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-16">
            {/* Contact Form - takes more space */}
            <div className="lg:col-span-3">
              <Card className="p-6 sm:p-8">
                <CardContent className="p-0">
                  <h3 className="mb-6 text-2xl font-bold text-primary-dark">
                    השאירו פרטים
                  </h3>
                  <IntakeForm />
                </CardContent>
              </Card>
            </div>

            {/* Contact Info Cards */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {CONTACT_INFO.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center",
                          "rounded-lg bg-accent/10",
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted">
                          {item.label}
                        </p>
                        <p
                          className="mt-1 text-base font-medium text-primary-dark"
                          dir={item.dir}
                        >
                          {item.value}
                        </p>
                      </div>
                    </div>
                  );

                  return (
                    <Card key={item.label} className="p-5">
                      {item.href ? (
                        <a
                          href={item.href}
                          className={cn(
                            "block transition-colors duration-200",
                            "hover:text-accent",
                          )}
                          aria-label={item.ariaLabel}
                        >
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Additional Info */}
              <Card className="mt-4 border-accent/30 bg-accent/5 p-5">
                <p className="text-sm font-semibold text-primary-dark">
                  ייעוץ ראשוני
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  הפגישה הראשונית עם צוות המשרד היא ללא עלות וללא התחייבות.
                  מטרתה להבין את הצרכים שלכם ולבחון כיצד נוכל לסייע.
                </p>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Map Placeholder */}
      <section aria-labelledby="contact-map-heading" className="pb-16 sm:pb-20">
        <Container>
          <h2 id="contact-map-heading" className="sr-only">
            מפת המשרד
          </h2>
          <div
            className={cn(
              "flex h-80 items-center justify-center rounded-xl",
              "border border-border bg-muted-bg",
            )}
            role="img"
            aria-label="מפה המציגה את מיקום משרד עורכי דין זומר ברחוב הברזל 30, תל אביב"
          >
            <div className="text-center">
              <MapPin
                className="mx-auto h-12 w-12 text-muted"
                aria-hidden="true"
              />
              <p className="mt-3 text-lg font-medium text-muted">
                מפת המשרד תוצג כאן
              </p>
              <p className="mt-1 text-sm text-muted">
                רחוב הברזל 30, תל אביב
              </p>
            </div>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
