"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { HeaderContent } from "@/types/content";
import { DEFAULT_HEADER_CONTENT } from "@/lib/content-defaults";

interface HeaderProps {
  content?: HeaderContent;
}

export default function Header({ content }: HeaderProps) {
  const data = content ?? DEFAULT_HEADER_CONTENT;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useIsAdmin();
  const hasAdminBar = isAdmin && !pathname.startsWith("/admin");
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      mobileMenuRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header
      role="banner"
      className={cn(
        "sticky z-50 w-full transition-all duration-300",
        hasAdminBar ? "top-10" : "top-0",
        "border-b border-border bg-background",
        isScrolled && "shadow-md backdrop-blur-sm bg-background/95"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 text-primary",
              "transition-colors duration-200 hover:text-primary-light"
            )}
            aria-label={`${data.logoText} - ${data.logoSubtext} - עמוד הבית`}
          >
            <span className="text-2xl font-bold tracking-tight">{data.logoText}</span>
            <span className="hidden text-sm font-medium text-muted sm:inline-block" aria-hidden="true">|</span>
            <span className="hidden text-sm font-medium text-muted sm:inline-block">{data.logoSubtext}</span>
          </Link>

          <nav role="navigation" aria-label="ניווט ראשי" className="hidden lg:flex">
            <ul className="flex items-center gap-1" role="list">
              {data.navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative inline-block rounded-md px-4 py-2 text-sm font-medium",
                      "transition-colors duration-200",
                      isActive(item.href) ? "text-accent" : "text-primary hover:text-accent hover:bg-muted-bg"
                    )}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    {item.label}
                    {isActive(item.href) && (
                      <span className="absolute inset-x-4 -bottom-[1px] h-0.5 bg-accent" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden lg:block">
            <Link
              href={data.ctaLink}
              className={cn(
                "inline-flex items-center rounded-md px-5 py-2.5",
                "bg-accent text-primary-dark text-sm font-bold",
                "transition-all duration-200 hover:bg-accent-light focus-visible:outline-accent"
              )}
            >
              {data.ctaText}
            </Link>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={toggleMobileMenu}
            className={cn(
              "inline-flex items-center justify-center rounded-md p-2 lg:hidden",
              "text-primary transition-colors duration-200 hover:bg-muted-bg hover:text-accent focus-visible:outline-accent"
            )}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMobileMenuOpen ? "סגור תפריט ניווט" : "פתח תפריט ניווט"}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <>
          <div className={cn("fixed inset-0 z-40 bg-foreground/40 lg:hidden", hasAdminBar ? "top-[7.5rem]" : "top-20")} aria-hidden="true" onClick={closeMobileMenu} />
          <div
            ref={mobileMenuRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="תפריט ניווט נייד"
            tabIndex={-1}
            className={cn("fixed inset-x-0 z-50 lg:hidden", hasAdminBar ? "top-[7.5rem]" : "top-20", "border-b border-border bg-background shadow-lg")}
          >
            <nav role="navigation" aria-label="ניווט ראשי - נייד">
              <ul className="divide-y divide-border px-4 py-2" role="list">
                {data.navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "block px-4 py-4 text-base font-medium transition-colors duration-200",
                        isActive(item.href) ? "text-accent bg-muted-bg" : "text-primary hover:text-accent hover:bg-muted-bg"
                      )}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border px-8 py-4">
                <Link
                  href={data.ctaLink}
                  onClick={closeMobileMenu}
                  className={cn(
                    "block w-full rounded-md px-5 py-3 text-center",
                    "bg-accent text-primary-dark font-bold transition-all duration-200 hover:bg-accent-light"
                  )}
                >
                  {data.ctaText}
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
