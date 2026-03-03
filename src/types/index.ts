export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  phone: string;
  email: string;
  address: string;
  socialLinks: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
  };
}

export interface ContentBlock {
  id: string;
  type: "hero" | "text" | "image" | "cta" | "features" | "testimonials" | "faq";
  data: Record<string, unknown>;
  order: number;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}
