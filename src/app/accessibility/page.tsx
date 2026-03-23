import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";

export const dynamic = "force-dynamic";

/* ---- Metadata ---- */

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description:
    "הצהרת הנגישות של אתר עו\"ד זומר. מידע על עמידה בתקני WCAG 2.1 AAA ואמצעי נגישות באתר.",
  openGraph: {
    title: "הצהרת נגישות | עו\"ד זומר",
    description:
      "הצהרת הנגישות של אתר עו\"ד זומר.",
  },
};

/* ---- Fetch from DB ---- */

async function getAccessibilityContent() {
  try {
    const page = await prisma.page.findUnique({
      where: { slug: "accessibility" },
      select: { content: true },
    });
    if (
      page?.content &&
      typeof page.content === "object" &&
      (page.content as Record<string, unknown>).type === "doc"
    ) {
      return page.content as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/* ---- Accessibility Features List (fallback) ---- */

interface AccessibilityFeature {
  readonly title: string;
  readonly description: string;
}

const ACCESSIBILITY_FEATURES: readonly AccessibilityFeature[] = [
  {
    title: "קישור דילוג לתוכן ראשי",
    description:
      "בכל עמוד קיים קישור \'דלג לתוכן הראשי\' המאפשר למשתמשי מקלדת וקוראי מסך לעבור ישירות לתוכן העמוד תוך דילוג על תפריט הניווט.",
  },
  {
    title: "ניווט מלא במקלדת",
    description:
      "כל האלמנטים האינטראקטיביים באתר (קישורים, כפתורים, טפסים) נגישים באמצעות מקלדת בלבד, כולל תפריט נייד הנסגר באמצעות מקש Escape.",
  },
  {
    title: "תגיות ARIA",
    description:
      "האתר משתמש בתגיות ARIA מתאימות כגון aria-label, aria-expanded, aria-current, aria-required, aria-invalid ו-role להבטחת חוויית גלישה מלאה עם טכנולוגיות מסייעות.",
  },
  {
    title: "ניגודיות צבעים גבוהה",
    description:
      "יחסי הניגודיות בין הטקסט לרקע עומדים בדרישות תקן WCAG 2.1 ברמת AAA (יחס מינימלי של 7:1 לטקסט רגיל ו-4.5:1 לטקסט גדול).",
  },
  {
    title: "מחוונים חזותיים למיקוד",
    description:
      "כל אלמנט אינטראקטיבי מציג מחוון מיקוד (focus indicator) ברור בעובי 3 פיקסלים בצבע מובחן, העומד בדרישות WCAG 2.1 AAA.",
  },
  {
    title: "מבנה כותרות סמנטי",
    description:
      "האתר משתמש בהיררכיית כותרות תקינה (h1 עד h6) המאפשרת לקוראי מסך לנווט ביעילות בין חלקי העמוד.",
  },
  {
    title: "טפסים נגישים",
    description:
      "כל שדות הטפסים כוללים תוויות (labels) מקושרות, הודעות שגיאה ברורות עם role=\"alert\", וסימון שדות חובה עם aria-required.",
  },
  {
    title: "תמיכה בכיווניות RTL",
    description:
      "האתר בנוי במלואו בכיווניות מימין לשמאל (RTL) התואמת את השפה העברית, עם שימוש בתכונות CSS לוגיות (margin-inline, padding-inline).",
  },
  {
    title: "התאמה לגודלי מסך",
    description:
      "האתר מעוצב באופן רספונסיבי ומותאם לכל גודלי המסך, ממכשירים ניידים ועד מסכי שולחן עבודה, ללא אובדן תוכן או פונקציונליות.",
  },
  {
    title: "כיבוד העדפת תנועה מופחתת",
    description:
      "האתר מכבד את הגדרת prefers-reduced-motion של מערכת ההפעלה ומפחית או מבטל אנימציות למשתמשים שביקשו זאת.",
  },
] as const;

/* ---- Supported Technologies ---- */

const SUPPORTED_TECHNOLOGIES: readonly string[] = [
  "NVDA (NonVisual Desktop Access)",
  "JAWS (Job Access With Speech)",
  "VoiceOver (macOS / iOS)",
  "TalkBack (Android)",
  "דפדפני Chrome, Firefox, Safari ו-Edge בגרסאותיהם העדכניות",
] as const;

/* ---- Page Component ---- */

export default async function AccessibilityPage() {
  const tiptapContent = await getAccessibilityContent();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        aria-labelledby="a11y-hero-heading"
        className="bg-primary py-16 sm:py-20"
      >
        <Container>
          <div className="text-center">
            <h1
              id="a11y-hero-heading"
              className={cn(
                "text-3xl font-bold leading-snug tracking-tight text-white",
                "sm:text-4xl lg:text-5xl",
              )}
            >
              הצהרת נגישות
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              עו&quot;ד זומר מחויב להנגשת האתר לכלל המשתמשים, לרבות אנשים
              עם מוגבלויות.
            </p>
          </div>
        </Container>
      </section>

      {/* Accessibility Content */}
      <section
        aria-labelledby="a11y-content-heading"
        className="py-16 sm:py-20"
      >
        <Container narrow>
          <h2 id="a11y-content-heading" className="sr-only">
            תוכן הצהרת הנגישות
          </h2>

          {tiptapContent ? (
            /* ── DB content (TipTap) ── */
            <div className="prose-rtl">
              <TipTapRenderer content={tiptapContent} />
            </div>
          ) : (
            /* ── Hardcoded fallback ── */
            <div className="space-y-12">
              {/* Commitment Section */}
              <article aria-labelledby="a11y-commitment-heading">
                <h2
                  id="a11y-commitment-heading"
                  className={cn(
                    "mb-4 text-2xl font-bold leading-snug text-primary-dark",
                    "border-b border-border pb-3",
                  )}
                >
                  מחויבות לנגישות
                </h2>
                <div className="space-y-3">
                  <p className="text-base leading-relaxed text-foreground">
                    עו&quot;ד זומר מאמין כי לכל אדם זכות לגישה שוות למידע
                    ולשירותים. מחויבות להבטיח שאתר האינטרנט יהיה נגיש
                    לכלל המשתמשים, לרבות אנשים עם מוגבלויות פיזיות, חושיות,
                    קוגניטיביות או טכנולוגיות.
                  </p>
                  <p className="text-base leading-relaxed text-foreground">
                    מחויבות זו נובעת מאמונה בשוויון ובכבוד האדם, ומעוגנת בחוק
                    שוויון זכויות לאנשים עם מוגבלות, התשנ&quot;ח-1998,
                    ובתקנות הנגישות לשירותי אינטרנט.
                  </p>
                </div>
              </article>

              {/* WCAG Compliance Section */}
              <article aria-labelledby="a11y-wcag-heading">
                <h2
                  id="a11y-wcag-heading"
                  className={cn(
                    "mb-4 text-2xl font-bold leading-snug text-primary-dark",
                    "border-b border-border pb-3",
                  )}
                >
                  עמידה בתקן WCAG 2.1
                </h2>
                <div className="space-y-3">
                  <p className="text-base leading-relaxed text-foreground">
                    אתר זה תוכנן ופותח בהתאם להנחיות הנגישות לתוכן אינטרנט
                    (Web Content Accessibility Guidelines - WCAG) בגרסה 2.1,
                    ברמת התאימות הגבוהה ביותר -{" "}
                    <strong className="font-bold">AAA</strong>.
                  </p>
                  <p className="text-base leading-relaxed text-foreground">
                    תקן זה מגדיר קריטריונים מחמירים לנגישות בארבעה עקרונות
                    מרכזיים: נתפס (Perceivable), ניתן להפעלה (Operable), מובן
                    (Understandable) וחסין (Robust).
                  </p>
                </div>
              </article>

              {/* Accessibility Features Section */}
              <article aria-labelledby="a11y-features-heading">
                <h2
                  id="a11y-features-heading"
                  className={cn(
                    "mb-6 text-2xl font-bold leading-snug text-primary-dark",
                    "border-b border-border pb-3",
                  )}
                >
                  אמצעי נגישות באתר
                </h2>
                <p className="mb-6 text-base leading-relaxed text-foreground">
                  להלן אמצעי הנגישות העיקריים שיושמו באתר:
                </p>
                <div className="space-y-4">
                  {ACCESSIBILITY_FEATURES.map((feature, index) => (
                    <Card key={index} className="border-s-4 border-s-accent">
                      <CardContent className="py-4">
                        <h3 className="text-base font-bold text-primary-dark">
                          {feature.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </article>

              {/* Supported Technologies Section */}
              <article aria-labelledby="a11y-tech-heading">
                <h2
                  id="a11y-tech-heading"
                  className={cn(
                    "mb-4 text-2xl font-bold leading-snug text-primary-dark",
                    "border-b border-border pb-3",
                  )}
                >
                  טכנולוגיות תומכות
                </h2>
                <p className="mb-4 text-base leading-relaxed text-foreground">
                  האתר נבדק ונמצא תואם לטכנולוגיות המסייעות הבאות:
                </p>
                <ul className="space-y-2" role="list">
                  {SUPPORTED_TECHNOLOGIES.map((tech, index) => (
                    <li
                      key={index}
                      className="me-5 text-base leading-relaxed text-foreground"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              </article>

              {/* Contact for Accessibility Issues */}
              <article aria-labelledby="a11y-contact-heading">
                <h2
                  id="a11y-contact-heading"
                  className={cn(
                    "mb-4 text-2xl font-bold leading-snug text-primary-dark",
                    "border-b border-border pb-3",
                  )}
                >
                  דרכי פנייה בנושא נגישות
                </h2>
                <div className="space-y-3">
                  <p className="text-base leading-relaxed text-foreground">
                    אם נתקלתם בבעיית נגישות באתר או שיש לכם הצעות לשיפור, אשמח
                    לשמוע מכם. מחויבות לטפל בכל פנייה בנושא נגישות תוך 5
                    ימי עסקים.
                  </p>

                  <Card className="mt-4 border-accent/30 bg-accent/5">
                    <CardContent className="py-5">
                      <h3 className="mb-3 text-base font-bold text-primary-dark">
                        רכז/ת נגישות
                      </h3>
                      <address className="not-italic">
                        <ul className="space-y-3" role="list">
                          <li>
                            <a
                              href="mailto:accessibility@zomer-law.co.il"
                              className={cn(
                                "flex items-center gap-3 text-sm text-foreground",
                                "transition-colors duration-200",
                                "hover:text-accent",
                              )}
                              aria-label="שלחו אימייל לרכז הנגישות: accessibility@zomer-law.co.il"
                            >
                              <Mail
                                className="h-5 w-5 shrink-0 text-accent"
                                aria-hidden="true"
                              />
                              <span dir="ltr">accessibility@zomer-law.co.il</span>
                            </a>
                          </li>
                          <li>
                            <a
                              href="tel:+972-3-000-0000"
                              className={cn(
                                "flex items-center gap-3 text-sm text-foreground",
                                "transition-colors duration-200",
                                "hover:text-accent",
                              )}
                              aria-label="התקשרו לרכז הנגישות: 03-000-0000"
                            >
                              <Phone
                                className="h-5 w-5 shrink-0 text-accent"
                                aria-hidden="true"
                              />
                              <span dir="ltr">03-000-0000</span>
                            </a>
                          </li>
                        </ul>
                      </address>
                    </CardContent>
                  </Card>
                </div>
              </article>

              {/* Last Updated Section */}
              <article aria-labelledby="a11y-updated-heading">
                <h2
                  id="a11y-updated-heading"
                  className={cn(
                    "mb-4 text-2xl font-bold leading-snug text-primary-dark",
                    "border-b border-border pb-3",
                  )}
                >
                  תאריך עדכון
                </h2>
                <p className="text-base leading-relaxed text-foreground">
                  הצהרת נגישות זו עודכנה לאחרונה בתאריך:{" "}
                  <time dateTime="2025-01-01" className="font-semibold">
                    ינואר 2025
                  </time>
                  .
                </p>
                <p className="mt-2 text-base leading-relaxed text-foreground">
                  מבוצעות סקירות נגישות תקופתיות והצהרה זו מתעדכנת בהתאם.
                </p>
              </article>
            </div>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
