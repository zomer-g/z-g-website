"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  readonly label: string;
  readonly href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "ראשי", href: "/" },
  { label: "אודות", href: "/about" },
  { label: "תחומי עיסוק", href: "/services" },
  { label: "מאמרים", href: "/articles" },
  { label: "מדיה", href: "/media" },
  { label: "צור קשר", href: "/contact" },
] as const;

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Track scroll position for sticky header styling
  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 10);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Handle Escape key to close mobile menu
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

  // Focus the mobile menu when it opens
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
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        "border-b border-border bg-background",
        isScrolled && "shadow-md backdrop-blur-sm bg-background/95"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo / Firm Name - right side in RTL */}
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 text-primary",
              "transition-colors duration-200 hover:text-primary-light"
            )}
            aria-label="זומר - משרד עורכי דין - עמוד הבית"
          >
            <span className="text-2xl font-bold tracking-tight">זומר</span>
            <span
              className="hidden text-sm font-medium text-muted sm:inline-block"
              aria-hidden="true"
            >
              |
            </span>
            <span className="hidden text-sm font-medium text-muted sm:inline-block">
              משרד עורכי דין
            </span>
          </Link>

          {/* Desktop Navigation - center */}
          <nav
            role="navigation"
            aria-label="ניווט ראשי"
            className="hidden lg:flex"
          >
            <ul className="flex items-center gap-1" role="list">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative inline-block rounded-md px-4 py-2 text-sm font-medium",
                      "transition-colors duration-200",
                      isActive(item.href)
                        ? "text-accent"
                        : "text-primary hover:text-accent hover:bg-muted-bg"
                    )}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    {item.label}
                    {isActive(item.href) && (
                      <span
                        className="absolute inset-x-4 -bottom-[1px] h-0.5 bg-accent"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:block">
            <Link
              href="/contact"
              className={cn(
                "inline-flex items-center rounded-md px-5 py-2.5",
                "bg-accent text-primary-dark text-sm font-bold",
                "transition-all duration-200",
                "hover:bg-accent-light",
                "focus-visible:outline-accent"
              )}
            >
              ייעוץ ראשוני
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={toggleMobileMenu}
            className={cn(
              "inline-flex items-center justify-center rounded-md p-2 lg:hidden",
              "text-primary transition-colors duration-200",
              "hover:bg-muted-bg hover:text-accent",
              "focus-visible:outline-accent"
            )}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMobileMenuOpen ? "סגור תפריט ניווט" : "פתח תפריט ניווט"}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay & Panel */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-20 z-40 bg-foreground/40 lg:hidden"
            aria-hidden="true"
            onClick={closeMobileMenu}
          />

          {/* Mobile Menu Panel - acts as a dialog-like region */}
          <div
            ref={mobileMenuRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="תפריט ניווט נייד"
            tabIndex={-1}
            className={cn(
              "fixed inset-x-0 top-20 z-50 lg:hidden",
              "border-b border-border bg-background shadow-lg"
            )}
          >
            <nav role="navigation" aria-label="ניווט ראשי - נייד">
              <ul className="divide-y divide-border px-4 py-2" role="list">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "block px-4 py-4 text-base font-medium",
                        "transition-colors duration-200",
                        isActive(item.href)
                          ? "text-accent bg-muted-bg"
                          : "text-primary hover:text-accent hover:bg-muted-bg"
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
                  href="/contact"
                  onClick={closeMobileMenu}
                  className={cn(
                    "block w-full rounded-md px-5 py-3 text-center",
                    "bg-accent text-primary-dark font-bold",
                    "transition-all duration-200",
                    "hover:bg-accent-light"
                  )}
                >
                  ייעוץ ראשוני
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
