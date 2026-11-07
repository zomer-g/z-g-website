import { auth } from "./auth";

/**
 * True when the request comes from a signed-in admin.
 *
 * The admin editors preview a post by loading its public page in an iframe
 * (components/admin/site-preview). Those pages 404 anything unpublished, so a
 * draft — the one thing an editor most needs to preview — showed nothing.
 * Public pages use this to let an admin see unpublished content; everyone
 * else still gets the 404. Never throws: a failed session lookup is "not an
 * admin".
 */
export async function isAdminViewer(): Promise<boolean> {
  try {
    return (await auth())?.user?.role === "ADMIN";
  } catch {
    return false;
  }
}
