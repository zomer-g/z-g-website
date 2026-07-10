// Single source of truth for the admin "page registry".
//
// Each entry binds together everything we know about an editable page:
//   slug       — DB row + API key, e.g. "court-downloader-privacy"
//   label      — Hebrew name shown in the admin UI
//   icon       — Lucide icon for the editor card
//   editHref   — admin URL of the editor (default: /admin/site-editor/{slug})
//   publicPath — public URL on the live site (undefined for templates/globals)
//
// Three callers consume this:
//
//   1. /admin/site-editor (the cards grid) — uses PAGE_GROUPS directly.
//   2. AdminBar on every public page — uses getDefByPublicPath() to figure out
//      where the "edit this page" button should go. Previously a hardcoded
//      switch fell back to `/admin` for every unmapped path, which is exactly
//      why new extension/dashboard pages opened the dashboard instead of
//      their own editor.
//   3. The two editor templates (/admin/pages/[slug], /admin/site-editor/
//      [page]) — use getDefBySlug() to render the page title, the public URL,
//      and the "open in new tab" + "copy URL" buttons.
//
// Add a new page in ONE place (this file) and all three contexts pick it up.

import {
  Home,
  Info,
  Phone,
  PanelTop,
  PanelBottom,
  Briefcase,
  Newspaper,
  Feather,
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
  BookMarked,
  FileSearch,
  Globe,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface PageDef {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Admin editor URL. Defaults to /admin/site-editor/{slug} when unset. */
  editHref?: string;
  /** Public URL on the live site. Undefined for templates / globals (header,
   *  footer, article-detail, service-detail) and for pages whose URL is
   *  derived dynamically (services/[slug], articles/[slug]). */
  publicPath?: string;
  /** Page managed by its own dedicated admin tool (its own model/table, not a
   *  CMS `Page` row) — e.g. the dictionary. The site-editor grid skips the
   *  /api/content status fetch for these and shows a neutral "ניהול" badge
   *  instead of "לא נמצא". */
  dedicatedTool?: boolean;
}

export interface ProjectSubGroup {
  title: string;
  items: PageDef[];
}

export interface PageGroup {
  title: string;
  items?: PageDef[];
  projects?: ProjectSubGroup[];
}

/* ─── The registry ─── */

export const PAGE_GROUPS: PageGroup[] = [
  {
    title: "דפי האתר הראשיים",
    items: [
      { slug: "home", label: "דף הבית", icon: Home, publicPath: "/" },
      { slug: "about", label: "אודות", icon: Info, publicPath: "/about" },
      { slug: "contact", label: "צור קשר", icon: Phone, publicPath: "/contact" },
      { slug: "services", label: "תחומי עיסוק", icon: Briefcase, publicPath: "/services" },
      { slug: "articles", label: "מאמרים", icon: Newspaper, publicPath: "/articles" },
      { slug: "haplilist", label: "הפליליסט (בלוג)", icon: Feather, publicPath: "/haplilist" },
      { slug: "media", label: "מדיה", icon: Tv, publicPath: "/media" },
      { slug: "projects", label: "מיזמים", icon: Code2, publicPath: "/projects" },
    ],
  },
  {
    title: "תבניות עיצוב וכותרות",
    items: [
      // Templates + globals — no single public URL.
      { slug: "header", label: "כותרת עליונה", icon: PanelTop },
      { slug: "footer", label: "כותרת תחתונה", icon: PanelBottom },
      { slug: "article-detail", label: "עמוד מאמר (תבנית)", icon: FileText },
      { slug: "service-detail", label: "עמוד שירות (תבנית)", icon: FileText },
    ],
  },
  {
    title: "עמודי חובה משפטית",
    items: [
      { slug: "privacy", label: "מדיניות פרטיות", icon: Shield, editHref: "/admin/pages/privacy", publicPath: "/privacy" },
      { slug: "accessibility", label: "הצהרת נגישות", icon: Accessibility, editHref: "/admin/pages/accessibility", publicPath: "/accessibility" },
      { slug: "terms", label: "תנאי שימוש", icon: ScrollText, editHref: "/admin/pages/terms", publicPath: "/terms" },
    ],
  },
  {
    title: "דשבורדים ומאגרי תוכן",
    items: [
      { slug: "leam", label: "לעם — אתרים אזרחיים", icon: Globe, publicPath: "/o" },
      { slug: "sanegoria", label: "דשבורד סניגוריה", icon: BarChart3, publicPath: "/sanegoria" },
      { slug: "class-actions", label: "דשבורד תובענות ייצוגיות", icon: Scale, publicPath: "/class-actions" },
      { slug: "conditional-arrangements", label: "דשבורד הסדרים מותנים", icon: Scale, publicPath: "/conditional-arrangements" },
      { slug: "guidelines", label: "מאגר הנחיות", icon: BookOpen, publicPath: "/guidelines" },
      { slug: "defamation-rulings", label: "פסקי דין בלשון הרע", icon: Scale, publicPath: "/defamation-rulings" },
      { slug: "foi-judgments", label: "פסיקות חופש מידע", icon: Scale, publicPath: "/foi-judgments" },
      { slug: "foi-costs", label: "הוצאות חופש מידע", icon: Scale, publicPath: "/foi-costs" },
      { slug: "drug-sentencing", label: "גזרי דין בעבירות סמים", icon: Scale, publicPath: "/drug-sentencing" },
      { slug: "comptroller-reports", label: "דוחות מבקר המדינה", icon: FileSearch, publicPath: "/comptroller-reports" },
      { slug: "data-pipeline", label: "זרימת המידע", icon: Workflow, publicPath: "/data-pipeline" },
      { slug: "milon", label: "מילון", icon: BookMarked, editHref: "/admin/milon", publicPath: "/dictionary", dedicatedTool: true },
    ],
  },
  {
    title: "אפליקציות ותוספי דפדפן",
    items: [
      { slug: "digital-services", label: "שירותים דיגיטליים (סקירה)", icon: Code2, publicPath: "/digital-services" },
    ],
    projects: [
      {
        title: "לץ המשפט — מוריד מסמכים מנט המשפט",
        items: [
          { slug: "court-downloader", label: "ראשי", icon: Code2, editHref: "/admin/pages/court-downloader", publicPath: "/court-downloader" },
          { slug: "court-downloader-privacy", label: "מדיניות פרטיות", icon: Shield, editHref: "/admin/pages/court-downloader-privacy", publicPath: "/court-downloader/privacy" },
          { slug: "court-downloader-terms", label: "תנאי שימוש", icon: ScrollText, editHref: "/admin/pages/court-downloader-terms", publicPath: "/court-downloader/terms" },
        ],
      },
      {
        title: "GovScraper — מוריד מאגרי ממשלה",
        items: [
          { slug: "govscraper", label: "ראשי", icon: Code2, editHref: "/admin/pages/govscraper", publicPath: "/govscraper" },
          { slug: "govscraper-privacy", label: "מדיניות פרטיות", icon: Shield, editHref: "/admin/pages/govscraper-privacy", publicPath: "/govscraper/privacy" },
          { slug: "govscraper-terms", label: "תנאי שימוש", icon: ScrollText, editHref: "/admin/pages/govscraper-terms", publicPath: "/govscraper/terms" },
        ],
      },
      {
        title: "OCOI — תוסף ניגוד עניינים",
        items: [
          { slug: "ocoi-extension", label: "ראשי", icon: Code2, editHref: "/admin/pages/ocoi-extension", publicPath: "/ocoi-extension" },
          { slug: "ocoi-extension-privacy", label: "מדיניות פרטיות", icon: Shield, editHref: "/admin/pages/ocoi-extension-privacy", publicPath: "/ocoi-extension/privacy" },
          { slug: "ocoi-extension-terms", label: "תנאי שימוש", icon: ScrollText, editHref: "/admin/pages/ocoi-extension-terms", publicPath: "/ocoi-extension/terms" },
        ],
      },
      {
        title: "Ocal — תוסף נבחרי ציבור",
        items: [
          { slug: "ocal", label: "ראשי", icon: Code2, editHref: "/admin/pages/ocal", publicPath: "/ocal" },
          { slug: "ocal-privacy", label: "מדיניות פרטיות", icon: Shield, editHref: "/admin/pages/ocal-privacy", publicPath: "/ocal/privacy" },
          { slug: "ocal-terms", label: "תנאי שימוש", icon: ScrollText, editHref: "/admin/pages/ocal-terms", publicPath: "/ocal/terms" },
        ],
      },
      {
        title: "איתור אסמכתאות",
        items: [
          { slug: "case-tracker", label: "ראשי", icon: Code2, editHref: "/admin/pages/case-tracker", publicPath: "/case-tracker" },
          { slug: "case-tracker-privacy", label: "מדיניות פרטיות", icon: Shield, editHref: "/admin/pages/case-tracker-privacy", publicPath: "/case-tracker/privacy" },
          { slug: "case-tracker-terms", label: "תנאי שימוש", icon: ScrollText, editHref: "/admin/pages/case-tracker-terms", publicPath: "/case-tracker/terms" },
        ],
      },
      {
        title: "כלים משפטיים — Google Docs",
        items: [
          { slug: "legal-tools", label: "ראשי", icon: Wrench, editHref: "/admin/pages/legal-tools", publicPath: "/legal-tools" },
          { slug: "legal-tools-privacy", label: "מדיניות פרטיות", icon: Shield, editHref: "/admin/pages/legal-tools-privacy", publicPath: "/legal-tools/privacy" },
          { slug: "legal-tools-terms", label: "תנאי שימוש", icon: ScrollText, editHref: "/admin/pages/legal-tools-terms", publicPath: "/legal-tools/terms" },
          { slug: "legal-tools-support", label: "תמיכה", icon: Phone, editHref: "/admin/pages/legal-tools-support", publicPath: "/legal-tools/support" },
        ],
      },
    ],
  },
];

/* ─── Derived flat list & lookups ─── */

/** Flat list of every PageDef across all groups + nested projects. */
export const ALL_PAGE_DEFS: PageDef[] = PAGE_GROUPS.flatMap((g) => [
  ...(g.items ?? []),
  ...(g.projects ?? []).flatMap((p) => p.items),
]);

const BY_SLUG = new Map<string, PageDef>(
  ALL_PAGE_DEFS.map((d) => [d.slug, d]),
);

const BY_PUBLIC_PATH = new Map<string, PageDef>(
  ALL_PAGE_DEFS
    .filter((d): d is PageDef & { publicPath: string } => !!d.publicPath)
    .map((d) => [d.publicPath, d]),
);

export function getDefBySlug(slug: string): PageDef | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Reverse-lookup for the AdminBar: given the path the user is currently
 * viewing on the public site, return the matching PageDef. Handles two
 * dynamic-route patterns explicitly — `/services/{slug}` and
 * `/articles/{slug}` — which don't have their own PageDef row.
 */
export function getDefByPublicPath(pathname: string): PageDef | null {
  const exact = BY_PUBLIC_PATH.get(pathname);
  if (exact) return exact;

  // Dynamic-route fallbacks. These route to dedicated admin tools rather
  // than a single-page editor.
  if (pathname.startsWith("/services/") && pathname.length > "/services/".length) {
    const slug = pathname.slice("/services/".length);
    return {
      slug: `service:${slug}`,
      label: "שירות",
      icon: Briefcase,
      editHref: `/admin/services?edit=${slug}`,
      publicPath: pathname,
    };
  }
  if (pathname.startsWith("/articles/") && pathname.length > "/articles/".length) {
    return {
      slug: "post-list",
      label: "מאמר",
      icon: Newspaper,
      editHref: "/admin/posts",
      publicPath: pathname,
    };
  }

  return null;
}

/** Resolves to the admin editor URL for a given DB slug — falls back to the
 *  default site-editor route when no explicit editHref is set. */
export function getEditUrlForSlug(slug: string): string {
  const def = getDefBySlug(slug);
  if (!def) return `/admin/site-editor/${slug}`;
  return def.editHref ?? `/admin/site-editor/${def.slug}`;
}

/** Public URL on the live site for a given DB slug, or null for
 *  templates/globals without a single canonical URL. */
export function getPublicPathForSlug(slug: string): string | null {
  return getDefBySlug(slug)?.publicPath ?? null;
}

/** Hebrew label for a given DB slug, with a sensible fallback. */
export function getLabelForSlug(slug: string): string {
  return getDefBySlug(slug)?.label ?? slug;
}
