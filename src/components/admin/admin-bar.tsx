"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil, LayoutDashboard, LogOut, PanelTop, PanelBottom, Eye, EyeOff } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEditMode } from "@/contexts/admin-bar-context";
import { cn } from "@/lib/utils";

function getEditUrl(pathname: string): string {
  if (pathname === "/") return "/admin/site-editor/home";
  if (pathname === "/about") return "/admin/site-editor/about";
  if (pathname === "/contact") return "/admin/site-editor/contact";
  if (pathname === "/media") return "/admin/site-editor/media";
  if (pathname === "/projects") return "/admin/site-editor/projects";
  if (pathname === "/digital-services") return "/admin/site-editor/digital-services";
  if (pathname === "/privacy") return "/admin/pages/privacy";
  if (pathname === "/terms") return "/admin/pages/terms";
  if (pathname === "/accessibility") return "/admin/pages/accessibility";
  if (pathname === "/services") return "/admin/site-editor/services";
  if (pathname.startsWith("/services/")) return "/admin/services";
  if (pathname === "/articles") return "/admin/site-editor/articles";
  if (pathname.startsWith("/articles/")) return "/admin/posts";
  return "/admin";
}

function getPageLabel(pathname: string): string {
  if (pathname === "/") return "דף הבית";
  if (pathname === "/about") return "אודות";
  if (pathname === "/contact") return "צור קשר";
  if (pathname === "/media") return "מדיה";
  if (pathname === "/projects") return "מיזמים";
  if (pathname === "/digital-services") return "שירותים דיגיטליים";
  if (pathname === "/privacy") return "מדיניות פרטיות";
  if (pathname === "/terms") return "תנאי שימוש";
  if (pathname === "/accessibility") return "הצהרת נגישות";
  if (pathname === "/services") return "תחומי עיסוק";
  if (pathname.startsWith("/services/")) return "שירות";
  if (pathname === "/articles") return "מאמרים";
  if (pathname.startsWith("/articles/")) return "מאמר";
  return "עמוד";
}

export function AdminBar() {
  const { isAdmin, isLoading, editMode, toggleEditMode } = useEditMode();
  const pathname = usePathname();

  if (isLoading || !isAdmin) return null;

  // Don't show on admin pages
  if (pathname.startsWith("/admin")) return null;

  const editUrl = getEditUrl(pathname);
  const pageLabel = getPageLabel(pathname);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex h-10 items-center justify-between",
        "bg-gray-900 px-3 text-xs text-white shadow-md sm:px-4",
        "animate-in fade-in slide-in-from-top-2 duration-300",
      )}
      role="toolbar"
      aria-label="סרגל ניהול"
    >
      {/* Right side — Edit page */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href={editUrl}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded bg-accent/90 px-2.5 py-1 text-xs font-bold text-primary-dark transition-colors hover:bg-accent"
        >
          <Pencil className="h-3 w-3" />
          <span className="hidden sm:inline">ערוך {pageLabel}</span>
          <span className="sm:hidden">ערוך</span>
        </Link>

        <Link
          href="/admin/site-editor/header"
          target="_blank"
          className="hidden items-center gap-1 rounded px-2 py-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
        >
          <PanelTop className="h-3 w-3" />
          <span>כותרת</span>
        </Link>

        <Link
          href="/admin/site-editor/footer"
          target="_blank"
          className="hidden items-center gap-1 rounded px-2 py-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
        >
          <PanelBottom className="h-3 w-3" />
          <span>תחתית</span>
        </Link>
      </div>

      {/* Left side — Toggle + Dashboard + Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleEditMode}
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors",
            editMode ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/10 hover:text-white",
          )}
          aria-label={editMode ? "הסתר כפתורי עריכה" : "הצג כפתורי עריכה"}
        >
          {editMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span className="hidden sm:inline">{editMode ? "עריכה" : "צפייה"}</span>
        </button>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LayoutDashboard className="h-3 w-3" />
          <span className="hidden sm:inline">לוח בקרה</span>
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="התנתקות"
        >
          <LogOut className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
