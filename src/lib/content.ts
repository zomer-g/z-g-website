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
  DEFAULT_SERVICES_CONTENT,
  DEFAULT_ARTICLES_CONTENT,
  DEFAULT_MEDIA_CONTENT,
  DEFAULT_ARTICLE_DETAIL_CONTENT,
  DEFAULT_SERVICE_DETAIL_CONTENT,
  CONTENT_DEFAULTS,
} from "@/lib/content-defaults";

/* ─── Deep Merge Utility ─── */

/**
 * Recursively merges `overrides` onto `defaults`.
 * - Plain objects are merged key-by-key so missing nested fields keep their defaults.
 * - Arrays and primitives from overrides replace the defaults entirely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(defaults: any, overrides: any): any {
  if (overrides === undefined || overrides === null) return defaults;
  if (typeof defaults !== "object" || defaults === null || Array.isArray(defaults)) {
    return overrides;
  }
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (overrides[key] !== undefined) {
      result[key] =
        typeof defaults[key] === "object" &&
        defaults[key] !== null &&
        !Array.isArray(defaults[key])
          ? deepMerge(defaults[key], overrides[key])
          : overrides[key];
    }
  }
  return result;
}

/* ─── Content Fetching Utilities ─── */

/**
 * Fetch published content for a page. Falls back to hardcoded defaults.
 * DB content is deep-merged with defaults so missing nested fields
 * always have safe fallback values.
 */
export async function getPageContent<T extends PageContentMap[PageSlug]>(
  slug: string
): Promise<T> {
  const defaults = CONTENT_DEFAULTS[slug] ?? {};

  try {
    const page = await prisma.page.findUnique({
      where: { slug },
      select: { content: true },
    });

    if (page?.content) {
      return deepMerge(defaults, page.content) as T;
    }
  } catch {
    // DB not available, fall through to defaults
  }

  return defaults as T;
}

/**
 * Fetch draft content for admin editing. Falls back to published, then defaults.
 * Deep-merged with defaults for safety.
 */
export async function getPageDraft<T extends PageContentMap[PageSlug]>(
  slug: string
): Promise<T> {
  const defaults = CONTENT_DEFAULTS[slug] ?? {};

  try {
    const page = await prisma.page.findUnique({
      where: { slug },
      select: { draftContent: true, content: true },
    });

    if (page?.draftContent) {
      return deepMerge(defaults, page.draftContent) as T;
    }
    if (page?.content) {
      return deepMerge(defaults, page.content) as T;
    }
  } catch {
    // DB not available
  }

  return defaults as T;
}

/**
 * Get the default hardcoded content for a page.
 */
export function getDefaultContent<T>(slug: string): T {
  return (CONTENT_DEFAULTS[slug] ?? {}) as T;
}
