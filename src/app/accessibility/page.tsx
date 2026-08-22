import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";

export const dynamic = "force-dynamic";

// The fallback's contact details. Kept here as named constants rather than
// inline strings so a wrong number is a one-line fix, not a hunt through JSX.
const CONTACT_EMAIL = "guy@z-g.co.il";
const CONTACT_PHONE = "054-7650202";
const CONTACT_PHONE_HREF = "+972547650202";

/* ---- Metadata ---- */

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description:
    "הצהרת הנגישות של אתר עו\"ד זומר: רמת הנגישות של האתר, מה עדיין אינו נגיש, ואיך לפנות בנושא.",
  openGraph: {
    title: "הצהרת נגישות",
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
            /* ── Fallback ──
               Deliberately short. This used to be a second, full copy of the
               statement kept in code, and the two drifted: the copy here still
               claimed WCAG 2.1 level AAA, named a coordinator at an address on
               a domain this site does not use, gave 03-000-0000 as the phone
               number, and was dated January 2025. A transient database error
               would have published all of that as the firm's legal statement
               on accessibility.

               Maintaining one authoritative version is the point. If the real
               statement cannot be loaded, say so plainly and give a way to
               reach a human — do not improvise a legal declaration. */
            <div className="space-y-4">
              <p className="text-base leading-relaxed text-foreground">
                לא ניתן לטעון כעת את הצהרת הנגישות המלאה. מדובר בתקלה זמנית
                בטעינת התוכן, ולא בהיעדר הצהרה.
              </p>
              <p className="text-base leading-relaxed text-foreground">
                אם נתקלתם בבעיית נגישות באתר, או שאתם זקוקים למידע כלשהו
                בפורמט נגיש, אשמח שתפנו אליי ואטפל בכך:
              </p>
              <address className="not-italic">
                <ul className="space-y-3" role="list">
                  <li>
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="flex items-center gap-3 text-sm text-foreground transition-colors duration-200 hover:text-accent-text"
                    >
                      <Mail className="h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
                      <span>אימייל: </span>
                      <span dir="ltr" lang="en">{CONTACT_EMAIL}</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={`tel:${CONTACT_PHONE_HREF}`}
                      className="flex items-center gap-3 text-sm text-foreground transition-colors duration-200 hover:text-accent-text"
                    >
                      <Phone className="h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
                      <span>טלפון: </span>
                      <span dir="ltr">{CONTACT_PHONE}</span>
                    </a>
                  </li>
                </ul>
              </address>
              <p className="text-base leading-relaxed text-muted">
                אשתדל להשיב לכל פנייה בנושא נגישות תוך 5 ימי עסקים.
              </p>
            </div>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
