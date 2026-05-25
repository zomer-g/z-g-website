"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { HeaderContent, NavItem } from "@/types/content";
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
        return;
      }
      // Focus trap: Tab/Shift+Tab within mobile menu
      if (event.key === "Tab" && mobileMenuRef.current) {
        const focusable = mobileMenuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
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

  // Tracks which mobile-menu item is expanded. Only one submenu can be
  // open at a time. Collapsed by every site interaction that closes the
  // outer menu (button toggle + link clicks) so it's never left in an
  // inconsistent state. No useEffect needed — both writers go through
  // the same handlers.
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      if (prev) setMobileExpanded(null);
      return !prev;
    });
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setMobileExpanded(null);
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
              {data.navItems.map((item) =>
                item.children && item.children.length > 0 ? (
                  <DesktopDropdown
                    key={item.href}
                    item={item}
                    isActive={isActive}
                  />
                ) : (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative inline-block rounded-md px-4 py-2 text-sm font-medium",
                        "transition-colors duration-200",
                        isActive(item.href) ? "text-accent-text" : "text-primary hover:text-accent-text hover:bg-muted-bg"
                      )}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      {item.label}
                      {isActive(item.href) && (
                        <span className="absolute inset-x-4 -bottom-[1px] h-0.5 bg-accent" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                ),
              )}
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
            aria-label={isMobileMenuOpen ? "לסגירת תפריט הניווט" : "לפתיחת תפריט הניווט"}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* DesktopDropdown is defined below — pulled out so the open/close
          state and the focus-management hooks stay local to each item
          rather than living on the Header. */}

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
                {data.navItems.map((item) => {
                  const hasChildren = !!item.children && item.children.length > 0;
                  const isExpanded = mobileExpanded === item.href;
                  return (
                    <li key={item.href}>
                      {hasChildren ? (
                        <div>
                          {/* Row holds two interactive zones: the label
                              navigates to the parent page; the chevron
                              toggles the submenu so the user can browse
                              without leaving the menu. */}
                          <div className="flex items-stretch">
                            <Link
                              href={item.href}
                              onClick={closeMobileMenu}
                              className={cn(
                                "flex-1 px-4 py-4 text-base font-medium transition-colors duration-200",
                                isActive(item.href) ? "text-accent-text bg-muted-bg" : "text-primary hover:text-accent-text hover:bg-muted-bg",
                              )}
                              aria-current={isActive(item.href) ? "page" : undefined}
                            >
                              {item.label}
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                setMobileExpanded((prev) =>
                                  prev === item.href ? null : item.href,
                                )
                              }
                              className={cn(
                                "px-3 text-primary hover:bg-muted-bg transition-colors duration-200",
                                isExpanded && "bg-muted-bg",
                              )}
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded
                                  ? `סגירת תפריט ${item.label}`
                                  : `פתיחת תפריט ${item.label}`
                              }
                            >
                              <ChevronDown
                                className={cn(
                                  "h-5 w-5 transition-transform duration-200",
                                  isExpanded && "rotate-180",
                                )}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                          {isExpanded ? (
                            <ul
                              className="border-s-2 border-accent/40 ms-6 my-1 space-y-0"
                              role="list"
                            >
                              {item.children!.map((child) => (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    onClick={closeMobileMenu}
                                    className={cn(
                                      "block px-4 py-2.5 text-sm transition-colors duration-200",
                                      isActive(child.href)
                                        ? "text-accent-text bg-muted-bg font-semibold"
                                        : "text-primary/90 hover:text-accent-text hover:bg-muted-bg",
                                    )}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={closeMobileMenu}
                          className={cn(
                            "block px-4 py-4 text-base font-medium transition-colors duration-200",
                            isActive(item.href) ? "text-accent-text bg-muted-bg" : "text-primary hover:text-accent-text hover:bg-muted-bg",
                          )}
                          aria-current={isActive(item.href) ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
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

/* ─── DesktopDropdown ───
 * A single nav entry that owns a submenu. Opens on hover OR focus
 * (keyboard-accessible), closes on mouse-leave / blur / Escape. The
 * parent link still navigates on click so a user with a fixed
 * destination doesn't get stuck in the menu — only the chevron / hover
 * surfaces the submenu.
 */
function DesktopDropdown({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLLIElement>(null);

  // Small open-on-enter / delayed-close so brushing past the chevron
  // doesn't snap the menu open/closed.
  const handleEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Esc closes when focus is anywhere inside the dropdown.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = isActive(item.href);

  return (
    <li
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={(e) => {
        // Only close when focus actually leaves the dropdown — not
        // when it moves between the parent link and the children.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          handleLeave();
        }
      }}
    >
      <div className="flex items-stretch">
        <Link
          href={item.href}
          className={cn(
            "relative inline-flex items-center rounded-s-md px-4 py-2 text-sm font-medium",
            "transition-colors duration-200",
            active
              ? "text-accent-text"
              : "text-primary hover:text-accent-text hover:bg-muted-bg",
          )}
          aria-current={active ? "page" : undefined}
        >
          {item.label}
          {active && (
            <span
              className="absolute inset-x-4 -bottom-[1px] h-0.5 bg-accent"
              aria-hidden="true"
            />
          )}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? `סגירת תפריט ${item.label}` : `פתיחת תפריט ${item.label}`}
          className={cn(
            "inline-flex items-center rounded-e-md px-1.5 py-2",
            "transition-colors duration-200",
            active ? "text-accent-text" : "text-primary hover:text-accent-text hover:bg-muted-bg",
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {open ? (
        <ul
          role="menu"
          aria-label={item.label}
          className={cn(
            "absolute end-0 top-full mt-1 min-w-[14rem]",
            "rounded-lg border border-border bg-background shadow-lg",
            "py-2 z-50",
          )}
        >
          {item.children!.map((child) => (
            <li key={child.href} role="none">
              <Link
                href={child.href}
                role="menuitem"
                className={cn(
                  "block px-4 py-2 text-sm transition-colors duration-200",
                  isActive(child.href)
                    ? "text-accent-text bg-muted-bg font-semibold"
                    : "text-primary hover:text-accent-text hover:bg-muted-bg",
                )}
                aria-current={isActive(child.href) ? "page" : undefined}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
