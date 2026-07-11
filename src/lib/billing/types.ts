/**
 * Shared types + a tiny read-only HTTP helper for the multi-provider billing
 * dashboard (/admin/billing).
 *
 * READ-ONLY BY CONSTRUCTION: every fetcher in this folder issues GET requests
 * only (Cloudflare billing uses GET; OpenAI/Neon/Render/DeepSeek are all GET).
 * There is no code path here that POSTs/PUTs/DELETEs to any provider, so even a
 * full-access key (Neon/Render/DeepSeek, which don't offer a read-only scope)
 * can't mutate anything through this surface.
 */

export type ProviderStatus =
  | "ok" // real billed/accrued cost figure in `currentMonthCost`
  | "estimated" // computed from plan tiers, not a cost API (Render)
  | "balance" // prepaid balance, not spend (DeepSeek)
  | "usage" // usage counters, not translated to $ (Neon)
  | "not-configured" // missing env / credential
  | "error"; // fetch failed

export interface ProviderBreakdownItem {
  name: string;
  value: number; // money in `currency`, unless the provider is `usage`
  unit?: string; // e.g. "GB", "compute-sec" for usage rows
}

export interface ProviderCost {
  id: string;
  label: string;
  status: ProviderStatus;
  currency: string | null; // "USD" | "CNY" | null
  /** Best-available monthly spend figure. null when not applicable (usage/balance/error). */
  currentMonthCost: number | null;
  /** Most recent closed invoice, when the provider bills in arrears (Cloudflare). */
  lastInvoiceAmount?: number | null;
  lastInvoiceDate?: string | null;
  /** Prepaid balance remaining (DeepSeek). */
  balance?: number | null;
  breakdown?: ProviderBreakdownItem[];
  asOf: string; // ISO timestamp of when we fetched
  detail?: string; // human-readable note or error message
  dashboardUrl: string; // link to the provider's own billing dashboard
  /** Whether `currentMonthCost` should be summed into the unified USD total. */
  countsTowardTotal: boolean;
}

/** A provider whose env isn't set yet — a uniform "connected but awaiting key" card. */
export function notConfigured(
  id: string,
  label: string,
  dashboardUrl: string,
  detail: string,
  asOf: string,
): ProviderCost {
  return {
    id,
    label,
    status: "not-configured",
    currency: null,
    currentMonthCost: null,
    asOf,
    detail,
    dashboardUrl,
    countsTowardTotal: false,
  };
}

/** An errored provider card — one failing provider must never break the page. */
export function providerError(
  id: string,
  label: string,
  dashboardUrl: string,
  err: unknown,
  asOf: string,
): ProviderCost {
  const detail =
    err instanceof Error ? err.message : typeof err === "string" ? err : "שגיאה לא ידועה";
  return {
    id,
    label,
    status: "error",
    currency: null,
    currentMonthCost: null,
    asOf,
    detail: detail.slice(0, 300),
    dashboardUrl,
    countsTowardTotal: false,
  };
}

/**
 * Minimal fetch-with-timeout returning parsed JSON. Throws on non-2xx (with a
 * trimmed body) or timeout so the caller's try/catch turns it into an error
 * card. `bearer` sets `Authorization: Bearer …`; the whole helper is GET-only.
 */
export async function getJson<T = unknown>(
  url: string,
  opts: { bearer?: string; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<T> {
  const { bearer, timeoutMs = 15_000, headers = {} } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...headers,
      },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error(`בקשה חרגה מ-${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/** Start-of-current-month as a Date (UTC), for MTD queries. */
export function startOfMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
