"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Home,
  Info,
  Phone,
  PanelTop,
  PanelBottom,
  ChevronLeft,
  Briefcase,
  Newspaper,
  Tv,
  FileText,
  Shield,
  Accessibility,
  ScrollText,
  Code2,
  Wrench,
  BarChart3,
  Scale,
  BookOpen,
  Globe,
} from "lucide-react";

/* ─── Types ─── */

interface PageData {
  title: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
  content: unknown;
}

interface SiteEditorCard {
  slug: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  data: PageData | null;
  error: boolean;
}

/* ─── Page Definitions ─── */
//
// Grouped layout: instead of one flat list of ~38 cards, the editor renders
// sections so related screens stay together — main site, legal pages,
// dashboards/databases, extension landings. Each extension (Legal Tools,
// Case Tracker, Ocal, OCOI, Court Downloader) ships as a triplet (ראשי /
// פרטיות / תנאי שימוש) and the triplets sit next to each other in the
// "אפליקציות ותוספי דפדפן" group.

interface PageDef {
  slug: string;
  label: string;
  icon: React.ElementType;
  href?: string;
}

interface PageGroup {
  title: string;
  items: PageDef[];
}

const PAGE_GROUPS: PageGroup[] = [
  {
    title: "דפי האתר הראשיים",
    items: [
      { slug: "home", label: "דף הבית", icon: Home },
      { slug: "about", label: "אודות", icon: Info },
      { slug: "contact", label: "צור קשר", icon: Phone },
      { slug: "services", label: "תחומי עיסוק", icon: Briefcase },
      { slug: "articles", label: "מאמרים", icon: Newspaper },
      { slug: "media", label: "מדיה", icon: Tv },
      { slug: "projects", label: "מיזמים", icon: Code2 },
    ],
  },
  {
    title: "תבניות עיצוב וכותרות",
    items: [
      { slug: "header", label: "כותרת עליונה", icon: PanelTop },
      { slug: "footer", label: "כותרת תחתונה", icon: PanelBottom },
      { slug: "article-detail", label: "עמוד מאמר (תבנית)", icon: FileText },
      { slug: "service-detail", label: "עמוד שירות (תבנית)", icon: FileText },
    ],
  },
  {
    title: "עמודי חובה משפטית",
    items: [
      { slug: "privacy", label: "מדיניות פרטיות", icon: Shield, href: "/admin/pages/privacy" },
      { slug: "accessibility", label: "הצהרת נגישות", icon: Accessibility, href: "/admin/pages/accessibility" },
      { slug: "terms", label: "תנאי שימוש", icon: ScrollText, href: "/admin/pages/terms" },
    ],
  },
  {
    title: "דשבורדים ומאגרי תוכן",
    items: [
      { slug: "leam", label: "לעם — אתרים אזרחיים", icon: Globe },
      { slug: "sanegoria", label: "דשבורד סניגוריה", icon: BarChart3 },
      { slug: "class-actions", label: "דשבורד תובענות ייצוגיות", icon: Scale },
      { slug: "conditional-arrangements", label: "דשבורד הסדרים מותנים", icon: Scale },
      { slug: "guidelines", label: "מאגר הנחיות", icon: BookOpen },
      { slug: "defamation-rulings", label: "פסקי דין בלשון הרע", icon: Scale },
      { slug: "foi-judgments", label: "פסיקות חופש מידע", icon: Scale },
      { slug: "foi-costs", label: "הוצאות חופש מידע", icon: Scale },
    ],
  },
  {
    title: "אפליקציות ותוספי דפדפן",
    items: [
      // עמוד הסקירה הכללי
      { slug: "digital-services", label: "שירותים דיגיטליים (סקירה)", icon: Code2 },

      // כלים משפטיים ל-Google Docs
      { slug: "legal-tools", label: "כלים משפטיים (ראשי)", icon: Wrench, href: "/admin/pages/legal-tools" },
      { slug: "legal-tools-privacy", label: "כלים משפטיים — פרטיות", icon: Shield, href: "/admin/pages/legal-tools-privacy" },
      { slug: "legal-tools-terms", label: "כלים משפטיים — תנאי שימוש", icon: ScrollText, href: "/admin/pages/legal-tools-terms" },
      { slug: "legal-tools-support", label: "כלים משפטיים — תמיכה", icon: Phone, href: "/admin/pages/legal-tools-support" },

      // איתור אסמכתאות
      { slug: "case-tracker", label: "איתור אסמכתאות (ראשי)", icon: Code2, href: "/admin/pages/case-tracker" },
      { slug: "case-tracker-privacy", label: "איתור אסמכתאות — פרטיות", icon: Shield, href: "/admin/pages/case-tracker-privacy" },
      { slug: "case-tracker-terms", label: "איתור אסמכתאות — תנאי שימוש", icon: ScrollText, href: "/admin/pages/case-tracker-terms" },

      // Ocal — תוסף נבחרי ציבור
      { slug: "ocal", label: "Ocal — תוסף נבחרי ציבור (ראשי)", icon: Code2, href: "/admin/pages/ocal" },
      { slug: "ocal-privacy", label: "Ocal — מדיניות פרטיות", icon: Shield, href: "/admin/pages/ocal-privacy" },
      { slug: "ocal-terms", label: "Ocal — תנאי שימוש", icon: ScrollText, href: "/admin/pages/ocal-terms" },

      // OCOI — תוסף ניגוד עניינים
      { slug: "ocoi-extension", label: "OCOI — תוסף ניגוד עניינים (ראשי)", icon: Code2, href: "/admin/pages/ocoi-extension" },
      { slug: "ocoi-extension-privacy", label: "OCOI — מדיניות פרטיות", icon: Shield, href: "/admin/pages/ocoi-extension-privacy" },
      { slug: "ocoi-extension-terms", label: "OCOI — תנאי שימוש", icon: ScrollText, href: "/admin/pages/ocoi-extension-terms" },

      // לץ המשפט — מוריד מסמכים מנט המשפט
      { slug: "court-downloader", label: "לץ המשפט — נט המשפט (ראשי)", icon: Code2, href: "/admin/pages/court-downloader" },
      { slug: "court-downloader-privacy", label: "לץ המשפט — מדיניות פרטיות", icon: Shield, href: "/admin/pages/court-downloader-privacy" },
      { slug: "court-downloader-terms", label: "לץ המשפט — תנאי שימוש", icon: ScrollText, href: "/admin/pages/court-downloader-terms" },
    ],
  },
];

// Flat list used for the bulk fetch loop. The group rendering uses
// PAGE_GROUPS directly to keep the section structure.
const PAGE_DEFS: PageDef[] = PAGE_GROUPS.flatMap((g) => g.items);

/* ─── Site Editor Page ─── */

export default function SiteEditorPage() {
  const [cards, setCards] = useState<SiteEditorCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllPages() {
      try {
        const results = await Promise.allSettled(
          PAGE_DEFS.map(async (def) => {
            const res = await fetch(`/api/content/${def.slug}?draft=true`);
            if (!res.ok) return null;
            return (await res.json()) as PageData;
          }),
        );

        const mapped: SiteEditorCard[] = PAGE_DEFS.map((def, i) => {
          const result = results[i];
          return {
            slug: def.slug,
            label: def.label,
            icon: def.icon,
            href: def.href,
            data:
              result.status === "fulfilled" ? result.value : null,
            error: result.status === "rejected",
          };
        });

        setCards(mapped);
      } catch {
        // Set all as errored
        setCards(
          PAGE_DEFS.map((def) => ({
            slug: def.slug,
            label: def.label,
            icon: def.icon,
            href: def.href,
            data: null,
            error: true,
          })),
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAllPages();
  }, []);

  /* ── Loading ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // O(1) lookup of the fetched data by slug so each group can render with the
  // same fresh state without iterating the whole `cards` array per item.
  const cardBySlug = new Map(cards.map((c) => [c.slug, c]));

  return (
    <div className="space-y-10">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">עורך האתר</h1>
      </div>

      {/* ── Grouped Sections ── */}
      {PAGE_GROUPS.map((group) => (
        <section key={group.title} className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-border pb-2">
            <h2 className="text-lg font-semibold text-foreground">
              {group.title}
            </h2>
            <span className="text-xs text-muted">
              {group.items.length} עמודים
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((def) => {
              const card = cardBySlug.get(def.slug);
              const Icon = def.icon;
              const isPublished = card?.data?.status === "PUBLISHED";

              return (
                <Link
                  key={def.slug}
                  href={def.href || `/admin/site-editor/${def.slug}`}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      "hover:shadow-md hover:border-primary/30",
                      "h-full",
                    )}
                  >
                    <CardContent className="flex flex-col gap-4 p-5">
                      {/* ── Icon + Title Row ── */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon size={20} className="text-primary" />
                          </div>
                          <h3 className="font-semibold text-foreground">
                            {def.label}
                          </h3>
                        </div>
                        <ChevronLeft size={20} className="text-muted shrink-0" />
                      </div>

                      {/* ── Status + Date ── */}
                      <div className="flex items-center justify-between">
                        {card?.data ? (
                          <Badge variant={isPublished ? "success" : "muted"}>
                            {isPublished ? "פורסם" : "טיוטה"}
                          </Badge>
                        ) : (
                          <Badge variant="muted">
                            {card?.error ? "שגיאה" : "לא נמצא"}
                          </Badge>
                        )}

                        {card?.data?.updatedAt && (
                          <span className="text-xs text-muted">
                            עודכן {formatDate(card.data.updatedAt)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
