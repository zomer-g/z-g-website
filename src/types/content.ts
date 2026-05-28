/* ─── Structured Content Types for CMS ─── */

// ── Shared Types ──

export interface NavItem {
  label: string;
  // The top-level link. When the item has children, the header still
  // renders this as the dropdown header — clicking it navigates to the
  // overview page, hovering/tapping the chevron opens the submenu.
  href: string;
  // Optional submenu. When present, the desktop header renders a
  // hover/focus dropdown and the mobile menu renders an expandable
  // accordion underneath the parent row.
  children?: NavItem[];
}

export interface ContactInfo {
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
  address: string;
  hours: string;
}

export interface CredentialItem {
  icon: string; // lucide icon name
  text: string;
}

export interface ValueItem {
  icon: string; // lucide icon name
  title: string;
  description: string;
}

// ── Homepage Content ──

export interface HomeHeroContent {
  title: string;
  titleAccent: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

export interface HomeServicesSection {
  title: string;
  subtitle: string;
}

export interface HomeAboutPreview {
  title: string;
  paragraphs: string[];
  ctaText: string;
  ctaLink: string;
}

export interface HomeArticlesSection {
  title: string;
  subtitle: string;
  ctaText: string;
}

export interface HomeCtaSection {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  phone: string;
  phoneHref: string;
}

export interface HomeProjectsPreview {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export interface HomePageContent {
  hero: HomeHeroContent;
  services: HomeServicesSection;
  aboutPreview: HomeAboutPreview;
  projectsPreview: HomeProjectsPreview;
  articles: HomeArticlesSection;
  cta: HomeCtaSection;
}

// ── About Page Content ──

export interface AboutHeroBanner {
  title: string;
  subtitle: string;
}

export interface AboutFirmStory {
  title: string;
  subtitle: string;
  paragraphs: string[];
}

export interface AboutAttorney {
  name: string;
  role: string;
  bio: string[];
  credentials: CredentialItem[];
}

export interface AboutValuesSection {
  title: string;
  subtitle: string;
  items: ValueItem[];
}

export interface AboutCtaSection {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

export interface AboutPageContent {
  hero: AboutHeroBanner;
  firmStory: AboutFirmStory;
  attorney: AboutAttorney;
  values: AboutValuesSection;
  cta: AboutCtaSection;
}

// ── Contact Page Content ──

export interface ContactHeroBanner {
  title: string;
  subtitle: string;
}

export interface ContactFormSection {
  title: string;
  phoneLabel: string;
  emailLabel: string;
  addressLabel: string;
  hoursLabel: string;
}

export interface ContactConsultationNote {
  title: string;
  description: string;
}

export interface ContactPageContent {
  hero: ContactHeroBanner;
  form: ContactFormSection;
  contactInfo: ContactInfo;
  consultationNote: ContactConsultationNote;
}

// ── Header Content ──

export interface HeaderContent {
  logoText: string;
  logoSubtext: string;
  navItems: NavItem[];
  ctaText: string;
  ctaLink: string;
}

// ── Footer Content ──

export interface FooterContent {
  firmName: string;
  firmSubtext: string;
  firmDescription: string;
  quickLinksTitle: string;
  quickLinks: NavItem[];
  contactTitle: string;
  contactInfo: ContactInfo;
  legalLinks: NavItem[];
  copyright: string;
}

// ── Services Listing Page Content ──

export interface ServicesHeroBanner {
  title: string;
  subtitle: string;
}

export interface ServicesGridSection {
  title: string;
  subtitle: string;
  emptyState: string;
  readMoreText: string;
}

export interface ServicesPageContent {
  hero: ServicesHeroBanner;
  grid: ServicesGridSection;
}

// ── Articles Listing Page Content ──

export interface ArticlesHeroBanner {
  title: string;
  subtitle: string;
}

export interface ArticlesGridSection {
  title: string;
  subtitle: string;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  readMoreText: string;
}

export interface ArticlesCtaSection {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

export interface ArticlesPageContent {
  hero: ArticlesHeroBanner;
  grid: ArticlesGridSection;
  cta: ArticlesCtaSection;
}

// ── Media Page Content ──

export interface MediaHeroBanner {
  title: string;
  subtitle: string;
}

export interface MediaGridSection {
  title: string;
  subtitle: string;
  emptyState: string;
}

export interface MediaTypeLabels {
  video: string;
  article: string;
  podcast: string;
  academic: string;
}

export interface MediaPageContent {
  hero: MediaHeroBanner;
  grid: MediaGridSection;
  typeLabels: MediaTypeLabels;
}

// ── Article Detail Page Content ──

export interface ArticleDetailDisclaimer {
  label: string;
  text: string;
  linkText: string;
  linkHref: string;
}

export interface ArticleDetailSidebarCta {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

export interface ArticleDetailStrings {
  breadcrumbHome: string;
  breadcrumbArticles: string;
  sidebarRelatedTitle: string;
  moreArticlesTitle: string;
  readMoreText: string;
  authorTemplate: string;
}

export interface ArticleDetailContent {
  disclaimer: ArticleDetailDisclaimer;
  sidebarCta: ArticleDetailSidebarCta;
  strings: ArticleDetailStrings;
}

// ── Service Detail Page Content ──

export interface ServiceDetailStrings {
  breadcrumbHome: string;
  breadcrumbServices: string;
  relatedServicesTitle: string;
}

export interface ServiceDetailContent {
  strings: ServiceDetailStrings;
}

// ── Projects Page Content ──

export interface ProjectItem {
  title: string;
  subtitle: string;
  description: string;
  url: string;
  icon: string; // lucide icon name
  tags: string[];
}

export interface ProjectsPageContent {
  hero: {
    title: string;
    subtitle: string;
  };
  projects: ProjectItem[];
  cta: {
    title: string;
    description: string;
    ctaText: string;
    ctaLink: string;
  };
}

// ── Digital Services Page Content ──

export interface DigitalServiceItem {
  title: string;
  subtitle: string;
  description: string;
  icon: string; // lucide icon name
  tags: string[];
}

export interface DigitalServicesPageContent {
  hero: { title: string; subtitle: string };
  intro: { title: string; paragraphs: string[] };
  services: { title: string; subtitle: string };
  items: DigitalServiceItem[];
  credentials: { title: string; items: string[] };
  cta: { title: string; description: string; ctaText: string; ctaLink: string };
}

// ── Sanegoria Dashboard Page Content ──

export interface SanegoriaPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  disclaimer: { paragraphs: string[] };
}

// ── Class Actions Dashboard Page Content ──

export interface ClassActionsPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  cacheTtlMinutes: number;
}

// ── Guidelines Dashboard Page Content ──

export interface GuidelinesPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  cacheTtlMinutes: number;
}

// ── Leam (לעם) Civic Sites Page Content ──

export interface LeamSiteItem {
  index: string;           // "01", "02" — decorative ordinal
  name: string;            // "מידע לעם"
  tagline: string;         // single-line subtitle
  description: string;     // paragraph body
  domain: string;          // bare domain shown LTR ("odata.org.il")
  url: string;             // full https URL the card links to
  icon: string;            // lucide icon name (Database, History, Calendar, Network, ...)
  tags: string[];          // chips at the bottom of the card
}

export interface LeamStat {
  k: string;               // main display value ("04", "49+", "∞", "100%")
  v: string;               // label below the value ("אתרים", "גופים ציבוריים", ...)
  srK?: string;            // optional screen-reader expansion for non-text glyphs (e.g. ∞ → "ללא הגבלה")
}

export interface LeamPageContent {
  metaStrip: string;       // small badge text above the hero title
  hero: {
    title: string;         // big wordmark — "לעם"
    subtitle: string;      // paragraph under the title (\n becomes <br>)
  };
  stats: LeamStat[];       // 4-cell counter strip in the hero
  manifesto: {
    title: string;
    body: string;          // paragraph text
  };
  sitesSection: {
    eyebrow: string;       // small label above the section heading ("האתרים")
    title: string;         // section heading ("ארבע שכבות של שקיפות")
  };
  sites: LeamSiteItem[];   // the 4 (or more) site cards
  ctaSiteLabel: string;    // CTA button text inside each site card ("כניסה לאתר")
  cta: {
    title: string;
    description: string;
    primaryCtaText: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
  };
}

// ── Defamation Rulings Dashboard Page Content ──

export interface DefamationRulingsPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  cacheTtlMinutes: number;
}

// ── FOI Petitions Rulings Dashboard Page Content ──

export interface FoiRulingsPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  cacheTtlMinutes: number;
}

// ── Conditional Arrangements Dashboard Page Content ──

export interface ConditionalArrangementsPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  cacheTtlMinutes: number;
}

// ── Union type for all page content ──

export type PageContentMap = {
  home: HomePageContent;
  about: AboutPageContent;
  contact: ContactPageContent;
  header: HeaderContent;
  footer: FooterContent;
  services: ServicesPageContent;
  articles: ArticlesPageContent;
  media: MediaPageContent;
  "article-detail": ArticleDetailContent;
  "service-detail": ServiceDetailContent;
  projects: ProjectsPageContent;
  "digital-services": DigitalServicesPageContent;
  sanegoria: SanegoriaPageContent;
  "class-actions": ClassActionsPageContent;
  guidelines: GuidelinesPageContent;
  "defamation-rulings": DefamationRulingsPageContent;
  "foi-rulings": FoiRulingsPageContent;
  "conditional-arrangements": ConditionalArrangementsPageContent;
  leam: LeamPageContent;
};

export type PageSlug = keyof PageContentMap;
