"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Image,
  Inbox,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  PenTool,
  Tv,
  SpellCheck,
  Trash2,
  TrendingUp,
  MessageCircle,
  Calendar,
  Gavel,
  BookOpen,
  ScrollText,
  Scale,
  Feather,
  BookMarked,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/* ─── Navigation Items ─── */
//
// Grouped so related screens sit together instead of one flat list. Every
// item points at an /admin/* screen — the data-dashboard items (class actions,
// conditional arrangements, guidelines) open their editor/settings page under
// /admin/site-editor, consistent with the rest of the menu.

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string | null; // null = ungrouped (rendered without a header)
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: null,
    items: [{ label: "לוח בקרה", href: "/admin", icon: LayoutDashboard }],
  },
  {
    title: "תוכן האתר",
    items: [
      { label: "עורך האתר", href: "/admin/site-editor", icon: PenTool },
      { label: "מאמרים", href: "/admin/posts", icon: FileText },
      { label: "הפליליסט", href: "/admin/plilist", icon: Feather },
      { label: "מילון", href: "/admin/milon", icon: BookMarked },
      { label: "תחומי עיסוק", href: "/admin/services", icon: Briefcase },
      { label: "הופעות מדיה", href: "/admin/media-appearances", icon: Tv },
      { label: "העלאת קבצים", href: "/admin/media", icon: Image },
    ],
  },
  {
    title: "מאגרים וכלי AI",
    items: [
      { label: "מדריך חופש המידע", href: "/admin/foi-guide", icon: BookOpen },
      { label: "הנחיות", href: "/admin/site-editor/guidelines", icon: ScrollText },
      {
        label: "תובענות ייצוגיות",
        href: "/admin/site-editor/class-actions",
        icon: Scale,
      },
      {
        label: "הסדרים מותנים",
        href: "/admin/site-editor/conditional-arrangements",
        icon: Gavel,
      },
      { label: "פח המשפט", href: "/admin/pach-hamishpat", icon: Trash2 },
    ],
  },
  {
    title: "תקשורת ופרויקטים",
    items: [
      { label: "ווטסאפ", href: "/admin/whatsapp", icon: MessageCircle },
      { label: "ציר זמן", href: "/admin/timeline", icon: Calendar },
      { label: "פניות", href: "/admin/submissions", icon: Inbox },
    ],
  },
  {
    title: "כלים והגדרות",
    items: [
      { label: "הגהה אוטומטית", href: "/admin/proofread", icon: SpellCheck },
      { label: "קידום SEO", href: "/admin/seo", icon: TrendingUp },
      { label: "עלויות ותקציב", href: "/admin/billing", icon: Wallet },
      { label: "הגדרות", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Flattened list of hrefs, longest first — used so the active item is the most
// specific match (e.g. /admin/site-editor/guidelines wins over
// /admin/site-editor, instead of both lighting up).
const allHrefs = navGroups
  .flatMap((g) => g.items.map((i) => i.href))
  .sort((a, b) => b.length - a.length);

/* ─── Component ─── */

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The active item is the longest href that prefixes the current path, so a
  // nested route (…/site-editor/guidelines) doesn't also activate its parent
  // (…/site-editor). "/admin" only matches exactly.
  const activeHref = (() => {
    if (pathname === "/admin") return "/admin";
    return (
      allHrefs.find(
        (h) => h !== "/admin" && (pathname === h || pathname.startsWith(h + "/")),
      ) ?? null
    );
  })();
  const isActive = (href: string) => href === activeHref;

  const handleSignOut = () => {
    signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <>
      {/* ── Mobile Hamburger Toggle ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed top-4 right-4 z-50 rounded-lg bg-primary-dark p-2 text-white shadow-lg",
          "lg:hidden",
          mobileOpen && "hidden",
        )}
        aria-label="פתח תפריט ניווט"
      >
        <Menu size={24} />
      </button>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 flex h-screen w-64 flex-col bg-primary-dark text-white",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        {/* ── Close Button (Mobile) ── */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 left-4 rounded-lg p-1 text-white/70 hover:text-white lg:hidden"
          aria-label="סגור תפריט ניווט"
        >
          <X size={20} />
        </button>

        {/* ── Logo Area ── */}
        <div className="flex flex-col items-center gap-1 border-b border-white/10 px-6 py-6">
          <span className="text-2xl font-bold tracking-wide">זומר</span>
          <span className="text-xs text-white/60">ניהול תוכן</span>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="ניווט ראשי">
          <div className="flex flex-col gap-4">
            {navGroups.map((group, gi) => (
              <div key={group.title ?? `group-${gi}`}>
                {group.title && (
                  <h2 className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    {group.title}
                  </h2>
                )}
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium",
                            "transition-colors duration-150",
                            active
                              ? "bg-white/15 text-white"
                              : "text-white/70 hover:bg-white/10 hover:text-white",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon size={18} className="shrink-0" />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Footer Actions ── */}
        <div className="border-t border-white/10 px-3 py-4">
          {/* View Public Site */}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium",
              "text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-150",
            )}
          >
            <ExternalLink size={18} className="shrink-0" />
            <span>צפייה באתר</span>
          </Link>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium",
              "text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors duration-150",
            )}
          >
            <LogOut size={18} className="shrink-0" />
            <span>התנתקות</span>
          </button>
        </div>
      </aside>
    </>
  );
}
