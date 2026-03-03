import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

/* ─── Metadata ─── */

export const metadata: Metadata = {
  title: "מאמרים | זומר - משרד עורכי דין",
  description:
    "מאמרים מקצועיים בתחומי המשפט — דיני חברות, נדל״ן, ליטיגציה, דיני עבודה ועוד. תובנות משפטיות מצוות משרד עורכי דין זומר.",
};

/* ─── Categories ─── */

interface Category {
  readonly label: string;
  readonly slug: string;
}

const CATEGORIES: readonly Category[] = [
  { label: "הכל", slug: "all" },
  { label: "דיני חברות", slug: "corporate-law" },
  { label: 'נדל"ן', slug: "real-estate" },
  { label: "ליטיגציה", slug: "litigation" },
  { label: "דיני עבודה", slug: "labor-law" },
  { label: "קניין רוחני", slug: "intellectual-property" },
  { label: "דיני מסים", slug: "tax-law" },
] as const;

/* ─── CSS Gradient Patterns for Article Covers ─── */

const COVER_GRADIENTS: readonly string[] = [
  "bg-gradient-to-br from-primary via-primary-light to-primary-dark",
  "bg-gradient-to-br from-primary-dark via-primary to-accent/40",
  "bg-gradient-to-br from-accent/60 via-primary-light to-primary",
  "bg-gradient-to-br from-primary-light via-accent/30 to-primary-dark",
  "bg-gradient-to-br from-primary via-accent/20 to-primary-light",
  "bg-gradient-to-br from-primary-dark via-primary-light to-accent/50",
] as const;

/* ─── Articles Data ─── */

interface ArticleSummary {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly date: string;
  readonly category: string;
  readonly categoryLabel: string;
}

const ARTICLES: readonly ArticleSummary[] = [
  {
    slug: "corporate-governance-guide",
    title: "מדריך מקיף לממשל תאגידי בישראל",
    excerpt:
      "ממשל תאגידי הוא מערכת הכללים והנהלים שלפיהם מנוהלת חברה. במאמר זה נסקור את עקרונות הממשל התאגידי בישראל, חובות הדירקטורים ונושאי המשרה, ואת ההתפתחויות האחרונות בתחום.",
    date: "2025-12-15",
    category: "corporate-law",
    categoryLabel: "דיני חברות",
  },
  {
    slug: "real-estate-tax-reform",
    title: "רפורמת מיסוי מקרקעין — מה חשוב לדעת",
    excerpt:
      "סקירה מקיפה של השינויים האחרונים בחוק מיסוי מקרקעין וההשלכות שלהם על רוכשי דירות, משקיעים ויזמי נדל״ן. כולל טיפים מעשיים לתכנון מס נכון.",
    date: "2025-11-28",
    category: "real-estate",
    categoryLabel: 'נדל"ן',
  },
  {
    slug: "class-action-trends",
    title: "מגמות בתובענות ייצוגיות — סקירה שנתית",
    excerpt:
      "סקירה של המגמות העיקריות בתחום התובענות הייצוגיות בישראל בשנה האחרונה, כולל ניתוח פסקי דין מרכזיים, שינויים בחקיקה וצפי להתפתחויות עתידיות.",
    date: "2025-10-10",
    category: "litigation",
    categoryLabel: "ליטיגציה",
  },
  {
    slug: "remote-work-legal-aspects",
    title: "היבטים משפטיים של עבודה מרחוק",
    excerpt:
      "המעבר לעבודה מרחוק מעלה שאלות משפטיות רבות בתחום דיני העבודה. מאמר זה סוקר את ההיבטים המשפטיים המרכזיים שמעסיקים ועובדים צריכים להכיר.",
    date: "2025-09-05",
    category: "labor-law",
    categoryLabel: "דיני עבודה",
  },
  {
    slug: "ai-intellectual-property",
    title: "בינה מלאכותית וקניין רוחני — אתגרים חדשים",
    excerpt:
      "ההתפתחויות המהירות בתחום הבינה המלאכותית מעלות שאלות חדשות בתחום הקניין הרוחני. מי הוא הבעלים של יצירה שנוצרה על ידי AI? כיצד מגנים על פטנטים בעידן ה-AI?",
    date: "2025-08-20",
    category: "intellectual-property",
    categoryLabel: "קניין רוחני",
  },
  {
    slug: "international-tax-planning",
    title: "תכנון מס בינלאומי — עקרונות ואסטרטגיות",
    excerpt:
      "מדריך מקצועי לתכנון מס בינלאומי עבור חברות ישראליות הפועלות בחו״ל ולחברות זרות הפועלות בישראל. סקירה של אמנות מס, מחירי העברה ושינויים רגולטוריים.",
    date: "2025-07-12",
    category: "tax-law",
    categoryLabel: "דיני מסים",
  },
] as const;

/* ─── Page Component ─── */

export default function ArticlesPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        className="bg-primary py-20 sm:py-28"
        aria-labelledby="articles-hero-heading"
      >
        <Container className="text-center">
          <div
            className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent"
            aria-hidden="true"
          />
          <h1
            id="articles-hero-heading"
            className="text-4xl font-bold leading-snug tracking-tight text-white sm:text-5xl"
          >
            מאמרים
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            תובנות משפטיות, עדכוני חקיקה ומאמרים מקצועיים מצוות עורכי הדין של
            משרד זומר.
          </p>
        </Container>
      </section>

      {/* Category Filters (visual placeholder — functionality for later) */}
      <section className="border-b border-border bg-background" aria-label="סינון לפי קטגוריה">
        <Container>
          <div className="flex flex-wrap items-center gap-2 py-4" role="list">
            {CATEGORIES.map((category, index) => (
              <span key={category.slug} role="listitem">
                <Badge
                  variant={index === 0 ? "primary" : "outline"}
                  className="cursor-pointer transition-colors duration-200 hover:bg-primary hover:text-white"
                >
                  {category.label}
                </Badge>
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* Articles Grid */}
      <section
        className="bg-background py-16 sm:py-24"
        aria-labelledby="articles-grid-heading"
      >
        <Container>
          <SectionHeading
            title="מאמרים אחרונים"
            subtitle="מאמרים מקצועיים ועדכונים בתחומי המשפט השונים."
            id="articles-grid-heading"
          />

          <ul
            role="list"
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {ARTICLES.map((article, index) => (
              <li key={article.slug}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="group block h-full focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-xl"
                  aria-label={`${article.title} — קרא עוד`}
                >
                  <Card className="flex h-full flex-col overflow-hidden hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200">
                    {/* Cover Image Placeholder (CSS Gradient) */}
                    <div
                      className={`${COVER_GRADIENTS[index % COVER_GRADIENTS.length]} relative h-48 w-full`}
                      aria-hidden="true"
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <span className="text-7xl font-bold text-white">
                          {article.title.charAt(0)}
                        </span>
                      </div>
                    </div>

                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Badge variant="accent">{article.categoryLabel}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Calendar
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <time dateTime={article.date}>
                            {formatDate(article.date)}
                          </time>
                        </span>
                      </div>
                      <CardTitle className="mt-2 group-hover:text-accent transition-colors duration-200">
                        {article.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <CardDescription className="line-clamp-3">
                        {article.excerpt}
                      </CardDescription>
                    </CardContent>

                    <CardFooter>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-accent transition-colors duration-200">
                        קרא עוד
                        <ArrowLeft
                          className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </CardFooter>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Newsletter CTA */}
      <section
        className="bg-muted-bg py-16"
        aria-labelledby="articles-cta-heading"
      >
        <Container className="text-center">
          <h2
            id="articles-cta-heading"
            className="text-2xl font-bold text-primary-dark sm:text-3xl"
          >
            הישארו מעודכנים
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            רוצים לקבל עדכונים על מאמרים חדשים ושינויי חקיקה? צרו קשר ונוסיף
            אתכם לרשימת התפוצה שלנו.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-lg font-bold text-primary-dark transition-colors duration-200 hover:bg-accent-light focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              צרו קשר
            </Link>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
