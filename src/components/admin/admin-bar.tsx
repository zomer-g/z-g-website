"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil, LayoutDashboard, LogOut, PanelTop, PanelBottom, Eye, EyeOff } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEditMode } from "@/contexts/admin-bar-context";
import { cn } from "@/lib/utils";
import { getDefByPublicPath, getEditUrlForSlug } from "@/lib/admin-page-map";

export function AdminBar() {
  const { isAdmin, isLoading, editMode, toggleEditMode } = useEditMode();
  const pathname = usePathname();

  if (isLoading || !isAdmin) return null;

  // Don't show on admin pages
  if (pathname.startsWith("/admin")) return null;

  // Single source of truth: looks the current public path up in the page
  // registry. Unknown paths get an "open dashboard" fallback rather than a
  // misleading "edit this page" button that goes to /admin.
  const def = getDefByPublicPath(pathname);
  const editUrl = def ? def.editHref ?? getEditUrlForSlug(def.slug) : null;
  const pageLabel = def?.label ?? "עמוד";

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
        {editUrl ? (
          <Link
            href={editUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded bg-accent/90 px-2.5 py-1 text-xs font-bold text-primary-dark transition-colors hover:bg-accent"
          >
            <Pencil className="h-3 w-3" />
            <span className="hidden sm:inline">ערוך {pageLabel}</span>
            <span className="sm:hidden">ערוך</span>
          </Link>
        ) : (
          <span className="rounded bg-white/10 px-2.5 py-1 text-xs text-white/60" title="עמוד זה אינו רשום ברישום עמודי האדמין">
            ללא עורך ייעודי
          </span>
        )}

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
