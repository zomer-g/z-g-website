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

// Clean up expired entries every 5 minutes. unref() so a housekeeping timer
// never keeps a process alive on its own (the test runner, one-off scripts).
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

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

// ---------------------------------------------------------------------------
// Global cost budget (IP-agnostic).
//
// The per-IP rateLimit above bounds how often *one* caller hits an endpoint,
// but it does nothing about aggregate cost: 30 embeds/min/IP times N distinct
// IPs times M instances is an unbounded bill to OpenAI. This is a second,
// shared ceiling on a *paid operation* regardless of who triggers it — a
// rolling window over the last `windowMs`, counting successful reservations
// across every IP in this process.
//
// A rolling (not fixed) window matters here: a fixed window lets 2× the limit
// slip through across a reset boundary, and for a spend cap that boundary is
// exactly where an attacker aims. We keep the raw timestamps and evict on
// read, so the count is always "how many in the trailing window, right now".
//
// Per-instance, like everything else in this file — on multi-instance
// deployments each box gets its own budget, so size the limit as
// per-instance-per-minute, not fleet-wide. It is a cost *ceiling*, not a
// fairness mechanism.
const budgetStore = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of budgetStore) {
    // Drop anything older than a generous window; if nothing recent, forget
    // the key entirely so idle budgets don't leak memory.
    const recent = hits.filter((t) => now - t < 3_600_000);
    if (recent.length === 0) budgetStore.delete(key);
    else budgetStore.set(key, recent);
  }
}, 5 * 60 * 1000).unref();

/**
 * Try to reserve one unit of a shared, rolling-window budget.
 *
 * @returns true if the operation is within budget (and a unit was consumed),
 *          false if the ceiling is already reached — caller should degrade
 *          rather than perform the paid work.
 */
export function tryConsumeBudget(
  key: string,
  { limit, windowMs = 60_000 }: { limit: number; windowMs?: number },
): boolean {
  const now = Date.now();
  const hits = budgetStore.get(key) ?? [];
  // Evict timestamps outside the trailing window.
  const recent = hits.filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    budgetStore.set(key, recent);
    return false;
  }
  recent.push(now);
  budgetStore.set(key, recent);
  return true;
}

/**
 * Extract client IP from request headers.
 *
 * Reads X-Forwarded-For from the right: each proxy we run behind appends the
 * address it saw, so the entry TRUSTED_PROXY_HOPS from the end (default 1,
 * the last one, written by the xhostd/Caddy edge) is the one a client cannot
 * forge; everything left of it is whatever the client sent. Set
 * TRUSTED_PROXY_HOPS=2 if a CDN is ever put in front of the edge.
 *
 * X-Real-IP is no longer read: it was set by Render, and with no proxy
 * writing it any client could pick its own rate-limit bucket.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
    return ips[Math.max(0, ips.length - hops)] || "unknown";
  }
  return "unknown";
}
