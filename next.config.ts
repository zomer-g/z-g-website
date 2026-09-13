import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://he.wikisource.org",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "z-g.co.il",
      },
      {
        protocol: "https",
        hostname: "*.z-g.co.il",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // ── Back/forward cache ──
      //
      // 64 of the 67 public pages are `force-dynamic`, for which Next sends
      // `no-store`. Chrome refuses to put a page with `no-store` into the
      // back/forward cache at all, so every use of the back button was a full
      // round trip and re-hydration rather than an instant restore. Lighthouse
      // reported it as three bf-cache failures, one of them "Actionable".
      //
      // `no-cache` (not `no-store`) keeps the freshness guarantee that
      // force-dynamic exists for: the browser may hold a copy but must
      // revalidate before reusing it, so a reader never sees stale CMS
      // content. `private` keeps it out of any shared or CDN cache.
      //
      // Scoped away from /api and /admin on purpose. API responses set their
      // own caching per route, and admin pages are the one place where a
      // restored-from-memory view could show another session's chrome.
      //
      // The פח המשפט RSS feed is excluded for the same reason as /api: it is
      // a route handler that sets its own caching, and it is not a page, so
      // none of the bf-cache reasoning above applies to it. Without the
      // exclusion this rule overwrote its `s-maxage`, which meant every feed
      // reader's poll — the exact traffic the short shared cache exists to
      // collapse — reached the database.
      {
        source: "/((?!api/|admin/|_next/|pach-hamishpat/feed\\.xml).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
