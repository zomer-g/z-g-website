import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/admin-sidebar";

/* ─── Admin Layout ─── */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // The admin shell is for ADMIN only. GUEST users (sign-in allowed via the
  // WhatsApp workspace allowlist) get redirected to login as if they're
  // anonymous — same as logged-out visitors. Their useful destination is
  // /whatsapp/<slug>, not the admin dashboard.
  if (session?.user?.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-muted-bg" dir="rtl">
      {/* ── Sidebar ── */}
      <AdminSidebar />

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col lg:mr-0">
        {/* ── Top Bar ── */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-6 shadow-sm">
          <div className="text-sm text-muted">מערכת ניהול</div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {session.user.name || session.user.email}
            </span>
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "תמונת משתמש"}
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {(session.user.name || session.user.email || "מ")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
