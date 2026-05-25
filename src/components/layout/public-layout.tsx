import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { AdminEditModeProvider } from "@/contexts/admin-bar-context";
import { AdminBar } from "@/components/admin/admin-bar";
import { getPageContent } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import type {
  HeaderContent,
  FooterContent,
  NavItem,
  ProjectsPageContent,
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

// Builds the "מיזמים" submenu from the same CMS content the /projects
// page consumes, so editing a project's title or URL in
// /admin/site-editor/projects automatically updates the header.
async function loadProjectNavItems(): Promise<NavItem[]> {
  try {
    const content = await getPageContent<ProjectsPageContent>("projects");
    return content.projects.map((p) => ({
      label: p.title,
      href: p.url,
    }));
  } catch {
    return [];
  }
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const [headerContent, footerContent, serviceChildren, projectChildren] =
    await Promise.all([
      getPageContent<HeaderContent>("header"),
      getPageContent<FooterContent>("footer"),
      loadServiceNavItems(),
      loadProjectNavItems(),
    ]);

  // Inject the live submenus. Each parent NavItem is identified by its
  // own href (so the marker doesn't depend on a separate field on the
  // type). Items without children: [] stay as ordinary links.
  const navWithDropdowns: NavItem[] = headerContent.navItems.map((item) => {
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
