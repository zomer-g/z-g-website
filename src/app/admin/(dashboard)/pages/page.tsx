import { redirect } from "next/navigation";

/**
 * The standalone "עמודים" listing was a redundant secondary index of the
 * same Page rows that "עורך האתר" already lists. We unified the two —
 * /admin/site-editor is now the single canonical entry point. This file
 * exists only so old bookmarks / external links keep working.
 *
 * The per-slug TipTap editor at /admin/pages/[slug] stays exactly where
 * it was; "עורך האתר" links straight to it via the `href` field on each
 * card for TipTap-style pages.
 */
export default function AdminPagesIndexRedirect() {
  redirect("/admin/site-editor");
}
