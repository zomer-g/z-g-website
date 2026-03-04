/* ─── Structured Content Types for CMS ─── */

// ── Shared Types ──

export interface NavItem {
  label: string;
  href: string;
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

export interface ServicePreviewItem {
  icon: string; // lucide icon name
  title: string;
  description: string;
  href: string;
}

export interface ArticlePreviewItem {
  title: string;
  excerpt: string;
  date: string;
  href: string;
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
  items: ServicePreviewItem[];
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
  items: ArticlePreviewItem[];
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

export interface HomePageContent {
  hero: HomeHeroContent;
  services: HomeServicesSection;
  aboutPreview: HomeAboutPreview;
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

// ── Union type for all page content ──

export type PageContentMap = {
  home: HomePageContent;
  about: AboutPageContent;
  contact: ContactPageContent;
  header: HeaderContent;
  footer: FooterContent;
};

export type PageSlug = keyof PageContentMap;
