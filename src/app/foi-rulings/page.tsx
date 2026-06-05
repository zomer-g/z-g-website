import { redirect } from "next/navigation";

/**
 * /foi-rulings was split into two specialised pages:
 *   /foi-judgments — only פס"ד (the original behaviour)
 *   /foi-costs     — only documents with a numeric "סכום הוצאות בשקלים"
 *
 * Keep this URL as a permanent redirect so any existing inbound links
 * (admin bookmarks, the old /admin/site-editor/foi-rulings entry, etc.)
 * land on the closest successor.
 */
export default function FoiRulingsRedirect(): never {
  redirect("/foi-judgments");
}
