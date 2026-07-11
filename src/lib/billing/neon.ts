/**
 * Neon — ESTIMATED monthly cost (plan base) + per-project usage.
 *
 * Neon does NOT expose a $ figure on the Launch plan: the consumption/cost API
 * is gated to "Scale plans and above" (the endpoint returns
 * "This endpoint is not available. It is included with Scale plans and above.")
 * and the billing/invoice endpoints 404. So the only readable data on Launch is
 * the raw usage counters on `/projects` (`cpu_used_sec`, `synthetic_storage_size`,
 * `quota_reset_at`). We therefore show an ESTIMATE = the plan's flat monthly
 * base, and surface the usage underneath. This is an approximation: it ignores
 * any usage overages beyond the plan's included allowances. Upgrading to Scale
 * would unlock the real cost API and turn this into "ok" (verified spend).
 *
 * Credential: a Neon API key (org/personal). Neon keys are full-access — no
 * read-only scope — but this fetcher only GETs. Env: NEON_API_KEY, and
 * optionally NEON_ORG_ID to scope the project list to one org.
 */

import { getJson, providerError, notConfigured, type ProviderCost } from "./types";

const DASHBOARD = "https://console.neon.tech/app/billing";

// Neon plan flat monthly base prices (USD), for the estimate. Launch = $19.
// https://neon.com/pricing — only the base; usage overages aren't in the API.
const PLAN_BASE_USD: Record<string, number> = {
  free: 0,
  launch: 19,
  scale: 69,
};

interface NeonProject {
  id: string;
  name: string;
  cpu_used_sec?: number;
  active_time?: number; // seconds of compute being active
  synthetic_storage_size?: number; // bytes
  quota_reset_at?: string;
}

interface NeonProjectsResponse {
  projects?: NeonProject[];
}

interface NeonOrg {
  plan?: string;
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

export async function fetchNeon(asOf: string): Promise<ProviderCost> {
  const key = process.env.NEON_API_KEY;
  if (!key) {
    return notConfigured(
      "neon",
      "Neon",
      DASHBOARD,
      "חסר NEON_API_KEY",
      asOf,
    );
  }

  try {
    const orgId = process.env.NEON_ORG_ID;
    const url = new URL("https://console.neon.tech/api/v2/projects");
    url.searchParams.set("limit", "100");
    if (orgId) url.searchParams.set("org_id", orgId);

    const data = await getJson<NeonProjectsResponse>(url.toString(), { bearer: key });
    const projects = data.projects ?? [];

    // Read the org's plan to pick the flat monthly base for the estimate.
    // Best-effort: if it fails or the plan is unknown, fall back to usage-only.
    let plan: string | undefined;
    if (orgId) {
      try {
        const org = await getJson<NeonOrg>(
          `https://console.neon.tech/api/v2/organizations/${orgId}`,
          { bearer: key },
        );
        plan = org.plan?.toLowerCase();
      } catch {
        /* leave plan undefined → usage-only card */
      }
    }
    const base = plan != null ? PLAN_BASE_USD[plan] : undefined;

    const totalStorage = projects.reduce(
      (s, p) => s + (p.synthetic_storage_size ?? 0),
      0,
    );
    const totalComputeSec = projects.reduce((s, p) => s + (p.cpu_used_sec ?? 0), 0);
    const resetAt = projects
      .map((p) => p.quota_reset_at)
      .filter(Boolean)
      .sort()[0];

    const usageLine =
      `${projects.length} פרויקטים · אחסון ${fmtBytes(totalStorage)} · ` +
      `מחשוב ${Math.round(totalComputeSec / 3600)} שעות` +
      (resetAt
        ? ` · איפוס מכסה ${new Date(resetAt).toLocaleDateString("he-IL")}`
        : "");

    const breakdown = [
      { name: "אחסון (סה״כ)", value: totalStorage, unit: "storage" },
      { name: "זמן מחשוב (CPU-sec)", value: totalComputeSec, unit: "compute" },
    ];

    // With a known plan → ESTIMATE (base price). Otherwise fall back to a
    // usage-only card. Either way this is never verified spend (Neon's cost API
    // is Scale+ only), so it stays out of the unified total.
    if (base != null) {
      return {
        id: "neon",
        label: "Neon",
        status: "estimated",
        currency: "USD",
        currentMonthCost: base,
        breakdown,
        asOf,
        detail:
          `הערכה: בסיס תוכנית ${plan} ($${base}/חודש) — Neon לא חושף $ ב-API ` +
          `בתוכנית זו (הצריכה בלבד ב-Scale+). לא כולל חריגות שימוש מעבר למכסה. · ${usageLine}`,
        dashboardUrl: DASHBOARD,
        countsTowardTotal: false,
      };
    }

    return {
      id: "neon",
      label: "Neon",
      status: "usage",
      currency: null,
      currentMonthCost: null,
      breakdown,
      asOf,
      detail: `${usageLine} — צריכה בלבד (Neon לא מחזיר $ ב-API)`,
      dashboardUrl: DASHBOARD,
      countsTowardTotal: false,
    };
  } catch (err) {
    return providerError("neon", "Neon", DASHBOARD, err, asOf);
  }
}
