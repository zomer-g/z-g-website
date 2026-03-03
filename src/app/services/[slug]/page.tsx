import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Scale,
  Building2,
  Gavel,
  Briefcase,
  Shield,
  FileText,
  ChevronLeft,
  Phone,
} from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

/* ─── Services Data (static — will be replaced by DB later) ─── */

interface ServiceData {
  readonly slug: string;
  readonly title: string;
  readonly icon: React.ElementType;
  readonly heroDescription: string;
  readonly content: readonly string[];
  readonly bulletPoints: readonly string[];
}

const SERVICES_DATA: Record<string, ServiceData> = {
  "corporate-law": {
    slug: "corporate-law",
    title: "דיני חברות",
    icon: Scale,
    heroDescription:
      "המחלקה לדיני חברות במשרד זומר מלווה חברות ועסקים בכל שלבי הפעילות העסקית, החל מהקמת החברה ועד למיזוגים, רכישות ועסקאות מורכבות.",
    content: [
      "משרד עורכי דין זומר מספק שירותי ייעוץ וליווי משפטי מקיפים בתחום דיני החברות והמשפט המסחרי. הצוות המקצועי שלנו מביא ניסיון רב שנים בליווי חברות מכל הגדלים — מסטארט-אפים בתחילת דרכם ועד לתאגידים גדולים הפועלים בישראל ובחו״ל.",
      "אנו מאמינים כי ליווי משפטי נכון הוא הבסיס להצלחה עסקית. לכן, אנו מקפידים להבין לעומק את הצרכים העסקיים של כל לקוח ולספק פתרונות משפטיים מותאמים אישית, תוך ראייה אסטרטגית ארוכת טווח.",
      "המחלקה מתמחה בליווי עסקאות מורכבות הכוללות מיזוגים ורכישות, גיוסי הון, הנפקות ועסקאות בינלאומיות. הצוות שלנו עובד בשיתוף פעולה צמוד עם יועצי מס, רואי חשבון ויועצים פיננסיים כדי להבטיח תוצאה מיטבית.",
    ],
    bulletPoints: [
      "הקמת חברות ושותפויות",
      "הסכמי מייסדים והסכמי השקעה",
      "מיזוגים ורכישות (M&A)",
      "ממשל תאגידי ודירקטוריונים",
      "הסכמים מסחריים ועסקיים",
      "ליווי גיוסי הון והנפקות",
    ],
  },
  "real-estate": {
    slug: "real-estate",
    title: 'נדל"ן',
    icon: Building2,
    heroDescription:
      "מחלקת הנדל״ן של המשרד מתמחה בליווי עסקאות נדל״ן מורכבות, ייצוג בפני רשויות התכנון ובנייה, ופרויקטים של התחדשות עירונית.",
    content: [
      "תחום הנדל״ן הוא אחד מתחומי הליבה של משרד עורכי דין זומר. הצוות שלנו מלווה לקוחות פרטיים ועסקיים בכל סוגי עסקאות הנדל״ן — מרכישת דירת מגורים ועד לעסקאות קומבינציה ופרויקטים של בנייה רחבי היקף.",
      "אנו מבינים כי עסקת נדל״ן היא לרוב אחת ההחלטות הכלכליות המשמעותיות ביותר בחיי אדם או עסק. לכן, אנו מקדישים תשומת לב מרבית לכל פרט ודואגים לנהל את ההליך המשפטי בצורה יסודית ומקצועית.",
      "המשרד צבר ניסיון רב בפרויקטים של התחדשות עירונית, לרבות תמ״א 38 ופינוי-בינוי. אנו מלווים יזמים, קבלנים ודיירים לאורך כל שלבי הפרויקט, מהשלב הראשוני של גיבוש העסקה ועד למסירת הדירות.",
    ],
    bulletPoints: [
      "עסקאות מכר ורכישה",
      "הסכמי שכירות מסחריים",
      "פרויקטי תמ״א 38 ופינוי-בינוי",
      "ייצוג בפני ועדות תכנון ובנייה",
      "ליווי יזמים וקבלנים",
      "רישום זכויות במקרקעין",
    ],
  },
  litigation: {
    slug: "litigation",
    title: "ליטיגציה",
    icon: Gavel,
    heroDescription:
      "מחלקת הליטיגציה של המשרד מייצגת לקוחות בהליכים משפטיים מורכבים בבתי המשפט בכל הערכאות, וכן בהליכי גישור ובוררות.",
    content: [
      "מחלקת הליטיגציה של משרד עורכי דין זומר מונה צוות עורכי דין מנוסים המתמחים בניהול הליכים משפטיים מורכבים. הצוות שלנו מייצג לקוחות בבתי המשפט בכל הערכאות — מבית משפט השלום ועד לבית המשפט העליון.",
      "אנו מתמחים בסכסוכים מסחריים, סכסוכי שותפים, הפרות חוזים, תביעות נגזרות ותובענות ייצוגיות. הגישה שלנו משלבת הכנה יסודית של התיק עם אסטרטגיה משפטית חדה ויכולת מיקוח אפקטיבית.",
      "לצד ההליכים בבתי המשפט, המשרד מציע גם שירותי גישור ובוררות כחלופה להליכים שיפוטיים. אנו מאמינים כי במקרים רבים ניתן להגיע לפתרון מהיר ויעיל יותר באמצעות מנגנוני יישוב סכסוכים חלופיים.",
    ],
    bulletPoints: [
      "ייצוג בבתי משפט בכל הערכאות",
      "סכסוכים מסחריים ועסקיים",
      "תביעות נגזרות ותובענות ייצוגיות",
      "גישור ובוררות",
      "הפרות חוזים",
      "צווי מניעה וסעדים זמניים",
    ],
  },
  "labor-law": {
    slug: "labor-law",
    title: "דיני עבודה",
    icon: Briefcase,
    heroDescription:
      "מחלקת דיני העבודה מספקת ייעוץ וליווי משפטי מקיף למעסיקים ולעובדים בכל היבטי יחסי העבודה.",
    content: [
      "משרד עורכי דין זומר מציע שירותים משפטיים מקיפים בתחום דיני העבודה, הן למעסיקים והן לעובדים. הצוות שלנו מכיר לעומק את חקיקת העבודה הישראלית ואת הפסיקה העדכנית, ומספק ייעוץ מותאם לצרכי כל לקוח.",
      "בעידן של שינויים תכופים בחקיקת העבודה ובפסיקה, חשוב במיוחד להיות מעודכנים ולפעול בהתאם לדין. אנו מסייעים למעסיקים לנהל את יחסי העבודה בצורה תקינה ולמנוע סכסוכים, ומייצגים עובדים בהגנה על זכויותיהם.",
      "המשרד מלווה ארגונים בגיבוש מדיניות העסקה, ניסוח חוזי עבודה, ניהול הליכי פיטורין והתפטרות, וכן בייצוג בפני בתי הדין לעבודה.",
    ],
    bulletPoints: [
      "ניסוח חוזי העסקה",
      "ליווי בהליכי סיום העסקה",
      "ייצוג בבתי הדין לעבודה",
      "הסכמים קיבוציים וצווי הרחבה",
      "מניעת הטרדה מינית במקום העבודה",
      "ייעוץ למעסיקים בנושאי שוויון הזדמנויות",
    ],
  },
  "intellectual-property": {
    slug: "intellectual-property",
    title: "קניין רוחני",
    icon: Shield,
    heroDescription:
      "מחלקת הקניין הרוחני מתמחה בהגנה על נכסים בלתי מוחשיים — פטנטים, סימני מסחר, זכויות יוצרים וסודות מסחריים.",
    content: [
      "בעולם העסקי המודרני, נכסי קניין רוחני הם לעיתים קרובות הנכסים היקרים ביותר של חברה. משרד עורכי דין זומר מספק ליווי משפטי מקצועי להגנה, ניצול ואכיפה של זכויות קניין רוחני.",
      "הצוות שלנו מלווה חברות טכנולוגיה, סטארט-אפים, יוצרים ומעצבים בכל הקשור להגנה על הקניין הרוחני שלהם. אנו מטפלים ברישום פטנטים וסימני מסחר, ניסוח הסכמי רישיון, ואכיפת זכויות כנגד מפרים.",
      "המשרד מספק גם ייעוץ אסטרטגי בנושאי קניין רוחני במסגרת עסקאות מיזוג ורכישה, הסכמי מחקר ופיתוח משותף, והסכמי סודיות. אנו מבינים כי הגנה אפקטיבית על קניין רוחני דורשת הן ידע משפטי והן הבנה טכנולוגית.",
    ],
    bulletPoints: [
      "רישום פטנטים וסימני מסחר",
      "הגנה על זכויות יוצרים",
      "הסכמי רישיון וסודיות",
      "אכיפת זכויות קניין רוחני",
      "ייעוץ בעסקאות טכנולוגיה",
      "הגנה על סודות מסחריים",
    ],
  },
  "tax-law": {
    slug: "tax-law",
    title: "דיני מסים",
    icon: FileText,
    heroDescription:
      "מחלקת המסים של המשרד מתמחה בתכנון מס אסטרטגי, ייצוג בהליכי שומה, ומתן חוות דעת מיסוייות מורכבות.",
    content: [
      "מחלקת המסים של משרד עורכי דין זומר מספקת מענה מקצועי ומקיף בכל תחומי המיסוי. הצוות שלנו כולל עורכי דין ורואי חשבון המתמחים בדיני מסים, ומביאים ניסיון רב בטיפול בסוגיות מיסוייות מורכבות.",
      "אנו מאמינים כי תכנון מס נכון הוא מרכיב חיוני בכל פעילות עסקית. המשרד מספק שירותי תכנון מס אסטרטגי לחברות ולאנשים פרטיים, תוך שמירה מלאה על מסגרת החוק ומקסום היתרונות המיסוייים.",
      "בנוסף לתכנון מס, המשרד מייצג לקוחות בהליכי שומה מול רשות המסים, בהליכי השגה וערעור, ובבתי המשפט. כמו כן, אנו מספקים חוות דעת מיסוייות מקצועיות ומלווים עסקאות מורכבות מההיבט המיסויי.",
    ],
    bulletPoints: [
      "תכנון מס אסטרטגי",
      "ייצוג בהליכי שומה והשגה",
      "מיסוי בינלאומי",
      "מיסוי מקרקעין",
      "מיסוי עסקאות מורכבות",
      "חוות דעת מיסוייות",
    ],
  },
};

/* ─── Related Services Helper ─── */

function getRelatedServices(currentSlug: string): ServiceData[] {
  return Object.values(SERVICES_DATA)
    .filter((s) => s.slug !== currentSlug)
    .slice(0, 3);
}

/* ─── Static Params ─── */

export function generateStaticParams() {
  return Object.keys(SERVICES_DATA).map((slug) => ({ slug }));
}

/* ─── Dynamic Metadata ─── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES_DATA[slug];

  if (!service) {
    return { title: "שירות לא נמצא | זומר - משרד עורכי דין" };
  }

  return {
    title: `${service.title} | תחומי עיסוק | זומר - משרד עורכי דין`,
    description: service.heroDescription,
  };
}

/* ─── Page Component ─── */

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = SERVICES_DATA[slug];

  if (!service) {
    notFound();
  }

  const Icon = service.icon;
  const relatedServices = getRelatedServices(slug);

  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <nav
        aria-label="מיקום נוכחי"
        className="border-b border-border bg-muted-bg"
      >
        <Container className="py-3">
          <ol
            className="flex flex-wrap items-center gap-2 text-sm"
            role="list"
          >
            <li>
              <Link
                href="/"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                ראשי
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <Link
                href="/services"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                תחומי עיסוק
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <span className="font-semibold text-primary-dark" aria-current="page">
                {service.title}
              </span>
            </li>
          </ol>
        </Container>
      </nav>

      {/* Hero */}
      <section
        className="bg-primary py-16 sm:py-24"
        aria-labelledby="service-hero-heading"
      >
        <Container>
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20"
              aria-hidden="true"
            >
              <Icon className="h-7 w-7 text-accent" />
            </div>
            <h1
              id="service-hero-heading"
              className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {service.title}
            </h1>
          </div>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            {service.heroDescription}
          </p>
        </Container>
      </section>

      {/* Main Content + Sidebar */}
      <section className="bg-background py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Main Content */}
            <article className="lg:col-span-2">
              <div className="prose-rtl">
                {service.content.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}

                <h2>תחומי ההתמחות שלנו</h2>
                <ul>
                  {service.bulletPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>

                <h2>למה לבחור במשרד זומר?</h2>
                <p>
                  משרד עורכי דין זומר מחויב למתן שירות משפטי ברמה הגבוהה ביותר.
                  הצוות שלנו משלב ידע משפטי מעמיק עם הבנה עסקית רחבה, ומספק
                  ללקוחותיו ליווי צמוד ומסור לאורך כל ההליך המשפטי. אנו מאמינים
                  ביחס אישי, בשקיפות מלאה ובתקשורת רציפה עם הלקוח.
                </p>

                <blockquote>
                  מקצועיות, מסירות ויחס אישי — אלו הערכים שמנחים את עבודתנו
                  בכל תיק ובכל לקוח.
                </blockquote>
              </div>
            </article>

            {/* Sidebar */}
            <aside aria-label="מידע נוסף" className="space-y-8">
              {/* CTA Card */}
              <Card className="border-accent/30 bg-primary text-white">
                <CardContent className="p-6">
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20"
                    aria-hidden="true"
                  >
                    <Phone className="h-6 w-6 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    צריכים ייעוץ משפטי?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    צוות המשרד ישמח לסייע לכם. צרו קשר לתיאום פגישת ייעוץ
                    ראשונית ללא התחייבות.
                  </p>
                  <Link
                    href="/contact"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-bold text-primary-dark transition-colors duration-200 hover:bg-accent-light focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    צרו קשר
                  </Link>
                </CardContent>
              </Card>

              {/* Related Services */}
              <div>
                <h2 className="mb-4 text-lg font-bold text-primary-dark">
                  תחומי עיסוק נוספים
                </h2>
                <ul role="list" className="space-y-3">
                  {relatedServices.map((related) => {
                    const RelatedIcon = related.icon;
                    return (
                      <li key={related.slug}>
                        <Link
                          href={`/services/${related.slug}`}
                          className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-accent/30 hover:shadow-sm focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                        >
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15"
                            aria-hidden="true"
                          >
                            <RelatedIcon className="h-5 w-5 text-accent" />
                          </div>
                          <span className="text-sm font-semibold text-primary-dark group-hover:text-accent transition-colors duration-200">
                            {related.title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
