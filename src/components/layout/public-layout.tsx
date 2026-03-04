import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { getPageContent } from "@/lib/content";
import type { HeaderContent, FooterContent } from "@/types/content";

interface PublicLayoutProps {
  readonly children: React.ReactNode;
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const [headerContent, footerContent] = await Promise.all([
    getPageContent<HeaderContent>("header"),
    getPageContent<FooterContent>("footer"),
  ]);

  return (
    <>
      <Header content={headerContent} />
      <main id="main-content" role="main" className="flex-1">
        {children}
      </main>
      <Footer content={footerContent} />
    </>
  );
}
