import { prisma } from "@/lib/prisma";
import type { PageContentMap, PageSlug } from "@/types/content";
import { CONTENT_DEFAULTS } from "@/lib/content-defaults";

/* Re-export defaults so existing server-side imports still work */
export {
  DEFAULT_HOME_CONTENT,
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_CONTACT_CONTENT,
  DEFAULT_HEADER_CONTENT,
  DEFAULT_FOOTER_CONTENT,
  CONTENT_DEFAULTS,
} from "@/lib/content-defaults";

/* ─── Content Fetching Utilities ─── */

/**
 * Fetch published content for a page. Falls back to hardcoded defaults.
 */
export async function getPageContent<T extends PageContentMap[PageSlug]>(
  slug: string
): Promise<T> {
  try {
    const page = await prisma.page.findUnique({
      where: { slug },
      select: { content: true },
    });

    if (page?.content) {
      return page.content as unknown as T;
    }
  } catch {
    // DB not available, fall through to defaults
  }

  return (CONTENT_DEFAULTS[slug] ?? {}) as T;
}

/**
 * Fetch draft content for admin editing. Falls back to published, then defaults.
 */
export async function getPageDraft<T extends PageContentMap[PageSlug]>(
  slug: string
): Promise<T> {
  try {
    const page = await prisma.page.findUnique({
      where: { slug },
      select: { draftContent: true, content: true },
    });

    if (page?.draftContent) {
      return page.draftContent as unknown as T;
    }
    if (page?.content) {
      return page.content as unknown as T;
    }
  } catch {
    // DB not available
  }

  return (CONTENT_DEFAULTS[slug] ?? {}) as T;
}

/**
 * Get the default hardcoded content for a page.
 */
export function getDefaultContent<T>(slug: string): T {
  return (CONTENT_DEFAULTS[slug] ?? {}) as T;
}
