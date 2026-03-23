import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";

export const dynamic = "force-dynamic";

/* ---- Metadata ---- */

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description:
    "מדיניות הפרטיות של עו\"ד זומר. מידע על איסוף, שימוש ושמירה על נתונים אישיים.",
  openGraph: {
    title: "מדיניות פרטיות | עו\"ד זומר",
    description:
      "מדיניות הפרטיות של עו\"ד זומר.",
  },
};

/* ---- Fetch from DB ---- */

async function getPrivacyContent() {
  try {
    const page = await prisma.page.findUnique({
      where: { slug: "privacy" },
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

/* ---- Privacy Sections Data (fallback) ---- */

interface PrivacySection {
  readonly id: string;
  readonly title: string;
  readonly content: readonly string[];
  readonly subsections?: readonly {
    readonly title: string;
    readonly content: readonly string[];
  }[];
}

const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    id: "general",
    title: "כללי",
    content: [
      "עו\"ד זומר (להלן: \"עורך הדין\") מכבד את פרטיות המשתמשים באתר האינטרנט שלו. מדיניות פרטיות זו מתארת כיצד נאסף, נעשה שימוש ומוגן המידע האישי שלכם.",
      "השימוש באתר מהווה הסכמה למדיניות פרטיות זו. מומלץ לקרוא מדיניות זו בעיון לפני השימוש באתר.",
      "המשרד שומר לעצמו את הזכות לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר.",
    ],
  },
  {
    id: "collection",
    title: "איסוף מידע",
    content: [
      "נאסף מידע שאתם מספקים ישירות, כגון בעת מילוי טופס יצירת קשר, שליחת פנייה או הרשמה לניוזלטר.",
    ],
    subsections: [
      {
        title: "מידע שנאסף ישירות",
        content: [
          "שם מלא, כתובת דואר אלקטרוני ומספר טלפון בעת שליחת טופס יצירת קשר.",
          "תוכן ההודעות והפניות שנשלחות דרך האתר.",
          "כל מידע נוסף שתבחרו לשתף במסגרת התקשרות מקצועית.",
        ],
      },
      {
        title: "מידע שנאסף אוטומטית",
        content: [
          "כתובת IP, סוג הדפדפן ומערכת ההפעלה.",
          "עמודים שנצפו, זמני גלישה ומקור ההפניה לאתר.",
          "עוגיות (Cookies) ונתוני שימוש אנונימיים לצורך שיפור חוויית הגלישה.",
        ],
      },
    ],
  },
  {
    id: "usage",
    title: "שימוש במידע",
    content: [
      "המידע שנאסף משמש למטרות הבאות:",
    ],
    subsections: [
      {
        title: "מטרות השימוש",
        content: [
          "מענה לפניות ובקשות שהתקבלו דרך האתר.",
          "מתן שירותים משפטיים מקצועיים ללקוחות.",
          "שיפור האתר, התכנים והשירותים המוצעים.",
          "עמידה בדרישות חוקיות ורגולטוריות.",
          "שליחת עדכונים מקצועיים ומידע רלוונטי, בכפוף להסכמתכם.",
        ],
      },
    ],
  },
  {
    id: "sharing",
    title: "שיתוף מידע",
    content: [
      "עורך הדין לא ימכור, ישכיר או יעביר את המידע האישי שלכם לצדדים שלישיים, אלא במקרים הבאים:",
    ],
    subsections: [
      {
        title: "מקרים בהם מידע עשוי להיות משותף",
        content: [
          "בהסכמתכם המפורשת.",
          "לצורך מתן שירותים משפטיים, כגון הגשת מסמכים לערכאות שיפוטיות.",
          "כאשר הדבר נדרש על פי חוק, צו בית משפט או דרישה רגולטורית.",
          "לספקי שירותים חיוניים (כגון שירותי אחסון אתרים), הכפופים להתחייבויות סודיות.",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "אבטחת מידע",
    content: [
      "ננקטים אמצעי אבטחה סבירים ומקובלים כדי להגן על המידע האישי שלכם מפני גישה בלתי מורשית, אובדן או שימוש לרעה.",
      "האתר מאובטח באמצעות פרוטוקול SSL/TLS להצפנת תעבורת נתונים.",
      "הגישה למידע אישי מוגבלת.",
      "יחד עם זאת, אין שיטת אבטחה מושלמת ולא ניתן להבטיח אבטחה מוחלטת של המידע.",
    ],
  },
  {
    id: "rights",
    title: "זכויות המשתמש",
    content: [
      "בהתאם לחוק הגנת הפרטיות, התשמ\"א-1981, עומדות לכם הזכויות הבאות:",
    ],
    subsections: [
      {
        title: "זכויותיכם",
        content: [
          "הזכות לעיין במידע האישי השמור אודותיכם.",
          "הזכות לבקש תיקון או מחיקה של מידע שגוי או שאינו מעודכן.",
          "הזכות להתנגד לשימוש במידע שלכם לצורכי דיוור ישיר.",
          "הזכות לבקש העברה של המידע האישי שלכם.",
          "הזכות להגיש תלונה לרשות להגנת הפרטיות.",
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "יצירת קשר",
    content: [
      "לכל שאלה, בקשה או תלונה בנוגע למדיניות הפרטיות, ניתן לפנות באחת מהדרכים הבאות:",
      "דואר אלקטרוני: privacy@zomer-law.co.il",
      "טלפון: 03-000-0000",
      "כתובת: רחוב הברזל 30, תל אביב",
      "מחויבות לטפל בכל פנייה תוך 30 ימי עסקים.",
    ],
  },
] as const;

/* ---- Page Component ---- */

export default async function PrivacyPage() {
  const tiptapContent = await getPrivacyContent();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        aria-labelledby="privacy-hero-heading"
        className="bg-primary py-16 sm:py-20"
      >
        <Container>
          <div className="text-center">
            <h1
              id="privacy-hero-heading"
              className={cn(
                "text-3xl font-bold leading-snug tracking-tight text-white",
                "sm:text-4xl lg:text-5xl",
              )}
            >
              מדיניות פרטיות
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              מחויבות להגנה על פרטיותכם ולשמירה על המידע האישי שלכם בהתאם
              לחוק הגנת הפרטיות.
            </p>
          </div>
        </Container>
      </section>

      {/* Privacy Content */}
      <section aria-labelledby="privacy-content-heading" className="py-16 sm:py-20">
        <Container narrow>
          <h2 id="privacy-content-heading" className="sr-only">
            תוכן מדיניות הפרטיות
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
                עודכן לאחרונה: ינואר 2025
              </p>

              <div className="space-y-12">
                {PRIVACY_SECTIONS.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`privacy-${section.id}-heading`}
                  >
                    <h2
                      id={`privacy-${section.id}-heading`}
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

                    {section.subsections?.map((sub, subIndex) => (
                      <div key={subIndex} className="mt-6">
                        <h3 className="mb-3 text-lg font-bold text-primary-dark">
                          {sub.title}
                        </h3>
                        <ul
                          className="list-disc space-y-2 pe-0 ps-0"
                          role="list"
                        >
                          {sub.content.map((item, itemIndex) => (
                            <li
                              key={itemIndex}
                              className="me-5 text-base leading-relaxed text-foreground"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
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
