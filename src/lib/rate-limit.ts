import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter using a sliding window.
 * Not suitable for multi-instance deployments — use Redis for that.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given key.
 * @returns null if allowed, or a NextResponse(429) if rate limited.
 */
export function rateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): NextResponse | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  return null;
}

/**
 * Extract client IP from request headers.
 * Uses x-forwarded-for but only trusts the LAST entry (set by the reverse proxy),
 * not the first (which can be spoofed by the client).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim());
    // Last IP is set by the reverse proxy (Render), harder to spoof
    return ips[ips.length - 1] || ips[0] || "unknown";
  }
  // Fallback: Render-specific header
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
