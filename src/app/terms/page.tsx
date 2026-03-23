import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";

export const dynamic = "force-dynamic";

/* ---- Metadata ---- */

export const metadata: Metadata = {
  title: "תנאי שימוש",
  description:
    "תנאי השימוש באתר עו\"ד זומר. מידע על זכויות, אחריות ותנאים המחייבים בשימוש באתר.",
  openGraph: {
    title: "תנאי שימוש | עו\"ד זומר",
    description: "תנאי השימוש באתר עו\"ד זומר.",
  },
};

/* ---- Fetch from DB ---- */

async function getTermsContent() {
  try {
    const page = await prisma.page.findUnique({
      where: { slug: "terms" },
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

/* ---- Fallback sections ---- */

interface TermsSection {
  readonly id: string;
  readonly title: string;
  readonly content: readonly string[];
}

const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    id: "general",
    title: "כללי",
    content: [
      "תנאי שימוש אלה חלים על השימוש באתר האינטרנט של עו\"ד זומר (להלן: \"האתר\"). השימוש באתר מהווה הסכמה לתנאים אלה.",
    ],
  },
  {
    id: "usage",
    title: "שימוש באתר",
    content: [
      "האתר מספק מידע כללי בנושאים משפטיים ואינו מהווה ייעוץ משפטי. המידע באתר אינו מחליף ייעוץ משפטי פרטני המותאם לנסיבותיכם.",
      "אין ליצור קשר משפטי בין עורך הדין לבין גולשי האתר על סמך המידע המוצג באתר בלבד.",
    ],
  },
  {
    id: "ip",
    title: "קניין רוחני",
    content: [
      "כל התכנים באתר, לרבות טקסטים, תמונות, עיצוב ולוגו, מוגנים בזכויות יוצרים ואין להעתיקם, לשכפלם או להפיצם ללא אישור בכתב מראש.",
    ],
  },
  {
    id: "liability",
    title: "הגבלת אחריות",
    content: [
      "עורך הדין אינו אחראי לנזק כלשהו שייגרם כתוצאה מהשימוש באתר או מהסתמכות על המידע המופיע בו.",
      "האתר עשוי לכלול קישורים לאתרים חיצוניים. עורך הדין אינו אחראי לתוכן של אתרים אלה.",
    ],
  },
  {
    id: "changes",
    title: "שינויים בתנאי השימוש",
    content: [
      "עורך הדין רשאי לשנות תנאים אלה מעת לעת. שינויים ייכנסו לתוקף מרגע פרסומם באתר.",
    ],
  },
  {
    id: "jurisdiction",
    title: "דין חל וסמכות שיפוט",
    content: [
      "תנאי שימוש אלה כפופים לדין הישראלי. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בתל אביב-יפו.",
    ],
  },
  {
    id: "contact",
    title: "יצירת קשר",
    content: [
      "לכל שאלה בנוגע לתנאי השימוש, ניתן לפנות בדואר אלקטרוני: guy@z-g.co.il",
    ],
  },
] as const;

/* ---- Page Component ---- */

export default async function TermsPage() {
  const tiptapContent = await getTermsContent();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        aria-labelledby="terms-hero-heading"
        className="bg-primary py-16 sm:py-20"
      >
        <Container>
          <div className="text-center">
            <h1
              id="terms-hero-heading"
              className={cn(
                "text-3xl font-bold leading-snug tracking-tight text-white",
                "sm:text-4xl lg:text-5xl",
              )}
            >
              תנאי שימוש
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              תנאי השימוש באתר עו&quot;ד זומר. אנא קראו בעיון לפני השימוש באתר.
            </p>
          </div>
        </Container>
      </section>

      {/* Terms Content */}
      <section aria-labelledby="terms-content-heading" className="py-16 sm:py-20">
        <Container narrow>
          <h2 id="terms-content-heading" className="sr-only">
            תוכן תנאי השימוש
          </h2>

          {tiptapContent ? (
            /* ── DB content (TipTap) ── */
            <div className="prose-rtl">
              <TipTapRenderer content={tiptapContent} />
            </div>
          ) : (
            /* ── Hardcoded fallback ── */
            <>
              <p className="mb-10 text-sm text-muted">
                עודכן לאחרונה: מרץ 2026
              </p>

              <div className="space-y-12">
                {TERMS_SECTIONS.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`terms-${section.id}-heading`}
                  >
                    <h2
                      id={`terms-${section.id}-heading`}
                      className={cn(
                        "mb-4 text-2xl font-bold leading-snug text-primary-dark",
                        "border-b border-border pb-3",
                      )}
                    >
                      {section.title}
                    </h2>

                    <div className="space-y-3">
                      {section.content.map((paragraph, i) => (
                        <p
                          key={i}
                          className="text-base leading-relaxed text-foreground"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
