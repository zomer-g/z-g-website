import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { AdminEditModeProvider } from "@/contexts/admin-bar-context";
import { AdminBar } from "@/components/admin/admin-bar";
import { getPageContent } from "@/lib/content";
import { DEFAULT_HEADER_CONTENT, DEFAULT_PROJECTS_CONTENT } from "@/lib/content-defaults";
import { prisma } from "@/lib/prisma";
import type {
  HeaderContent,
  FooterContent,
  NavItem,
} from "@/types/content";

interface PublicLayoutProps {
  readonly children: React.ReactNode;
}

// Loads the active services in slug order and returns them as child
// NavItems. Used to populate the "תחומי עיסוק" dropdown in the header.
// On DB error we fall back to an empty list — the header still shows
// the parent entry, just without a sub-menu.
async function loadServiceNavItems(): Promise<NavItem[]> {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { slug: true, title: true },
    });
    return services.map((s) => ({
      label: s.title,
      href: `/services/${s.slug}`,
    }));
  } catch {
    return [];
  }
}

// Builds the "מיזמים" submenu from the code-defined defaults so that
// structural changes (add/remove/rename projects) take effect on deploy
// without requiring a CMS publish step.
function loadProjectNavItems(): NavItem[] {
  return DEFAULT_PROJECTS_CONTENT.projects.map((p) => ({
    label: p.title,
    href: p.url,
  }));
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const [headerContent, footerContent, serviceChildren] =
    await Promise.all([
      getPageContent<HeaderContent>("header"),
      getPageContent<FooterContent>("footer"),
      loadServiceNavItems(),
    ]);
  const projectChildren = loadProjectNavItems();

  // Use the code-defined nav structure as the authoritative base so
  // that changes in content-defaults.ts take effect immediately without
  // needing to reseed the DB. Only branding fields (logo, CTA) come
  // from the DB-stored CMS row so editors can still update them via
  // the site-editor without a deploy.
  const navWithDropdowns: NavItem[] = DEFAULT_HEADER_CONTENT.navItems.map((item) => {
    if (item.children === undefined) return item;
    if (item.href === "/services") return { ...item, children: serviceChildren };
    if (item.href === "/projects") return { ...item, children: projectChildren };
    return item;
  });
  const headerWithDropdowns: HeaderContent = {
    ...headerContent,
    navItems: navWithDropdowns,
  };

  return (
    <AdminEditModeProvider>
      <AdminBar />
      <Header content={headerWithDropdowns} />
      <main id="main-content" role="main" className="flex-1">
        {children}
      </main>
      <Footer content={footerContent} />
    </AdminEditModeProvider>
  );
}
