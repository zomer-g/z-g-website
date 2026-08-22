/**
 * The one place the site's public origin is defined.
 *
 * This is deliberately a constant and NOT read from an environment variable.
 * `SITE_URL` on Render was set to `https://z-g-website.onrender.com` — the
 * host's internal address — and `layout.tsx` fed it to `metadataBase`. The
 * result was that every canonical, og:url and og:image on the site pointed at
 * a domain that is not the brand, telling Google the real version of each page
 * lived somewhere else. A law firm's domain does not change; an env var that
 * can silently redirect the whole site's SEO is a liability, not a feature.
 *
 * `www` because that is what the site actually serves: https://z-g.co.il
 * answers 301 → https://www.z-g.co.il, so the www form is the canonical one
 * and the sitemap, structured data and canonical tags must all agree on it.
 * They previously did not — the sitemap and JSON-LD hardcoded the bare domain
 * while the served pages were on www.
 */
export const SITE_ORIGIN = "https://www.z-g.co.il";

/** Absolute URL for a site-relative path. `absoluteUrl("/about")`. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Hosts that may serve this app but must never be indexed. Render always
 * exposes a service on its own subdomain in addition to any custom domain, and
 * that copy answered 200 with `robots: index, follow` — a complete duplicate of
 * the site competing with it in search results.
 */
export function isCanonicalHost(host: string | null | undefined): boolean {
  if (!host) return true; // nothing to judge on; do not block
  const h = host.toLowerCase().split(":")[0];
  return h === "www.z-g.co.il" || h === "z-g.co.il" || h === "localhost";
}
