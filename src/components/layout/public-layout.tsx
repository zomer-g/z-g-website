import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { AdminEditModeProvider } from "@/contexts/admin-bar-context";
import { AdminBar } from "@/components/admin/admin-bar";
import { getPageContent } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import type { HeaderContent, FooterContent, NavItem } from "@/types/content";

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

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const [headerContent, footerContent, serviceChildren] = await Promise.all([
    getPageContent<HeaderContent>("header"),
    getPageContent<FooterContent>("footer"),
    loadServiceNavItems(),
  ]);

  // Inject the live services list into the "תחומי עיסוק" dropdown.
  // Identified by `children` being defined on the nav item (the
  // default header content marks that entry — see content-defaults.ts).
  const navWithDropdowns: NavItem[] = headerContent.navItems.map((item) =>
    item.children !== undefined
      ? { ...item, children: serviceChildren }
      : item,
  );
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
