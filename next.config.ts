import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
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
  async redirects() {
    return [
      // Old site used capitalized paths — redirect to lowercase
      { source: "/About", destination: "/about", permanent: true },
      { source: "/Contact", destination: "/contact", permanent: true },
      { source: "/Services", destination: "/services", permanent: true },
      { source: "/Articles", destination: "/articles", permanent: true },
      { source: "/Media", destination: "/media", permanent: true },
      { source: "/Privacy", destination: "/privacy", permanent: true },
      { source: "/Terms", destination: "/terms", permanent: true },
      { source: "/Accessibility", destination: "/accessibility", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
