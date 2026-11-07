/**
 * Shown above unpublished content that an admin is previewing on the public
 * page. Only ever rendered for admins — the public gets a 404 instead.
 */
export function DraftBanner({ label = "טיוטה — לא פורסם. רק מנהלי האתר רואים את העמוד הזה." }: { label?: string }) {
  return (
    <div
      role="status"
      dir="rtl"
      className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900"
    >
      {label}
    </div>
  );
}
