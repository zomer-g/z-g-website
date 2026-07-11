/**
 * Neon — per-project usage for the current billing cycle.
 *
 * The Neon API returns usage *quantities* (compute-seconds, storage bytes,
 * active time) but not a dollar figure — converting to $ requires applying the
 * plan's per-unit rates, which the API doesn't expose. So this card reports
 * USAGE, not spend, and is excluded from the unified $ total. The `/projects`
 * list already carries the current-cycle counters (`cpu_used_sec`,
 * `synthetic_storage_size`, `quota_reset_at`), so we sum those across projects
 * without any date-range wrangling.
 *
 * Credential: a Neon API key (org/personal). Neon keys are full-access — no
 * read-only scope — but this fetcher only GETs. Env: NEON_API_KEY, and
 * optionally NEON_ORG_ID to scope the project list to one org.
 */

import { getJson, providerError, notConfigured, type ProviderCost } from "./types";

const DASHBOARD = "https://console.neon.tech/app/billing";

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

    const totalStorage = projects.reduce(
      (s, p) => s + (p.synthetic_storage_size ?? 0),
      0,
    );
    const totalComputeSec = projects.reduce((s, p) => s + (p.cpu_used_sec ?? 0), 0);
    const resetAt = projects
      .map((p) => p.quota_reset_at)
      .filter(Boolean)
      .sort()[0];

    return {
      id: "neon",
      label: "Neon",
      status: "usage",
      currency: null,
      currentMonthCost: null,
      breakdown: [
        { name: "אחסון (סה״כ)", value: totalStorage, unit: "storage" },
        { name: "זמן מחשוב (CPU-sec)", value: totalComputeSec, unit: "compute" },
        ...projects.map((p) => ({
          name: p.name,
          value: p.synthetic_storage_size ?? 0,
          unit: "storage",
        })),
      ],
      asOf,
      detail:
        `${projects.length} פרויקטים · אחסון ${fmtBytes(totalStorage)} · ` +
        `מחשוב ${Math.round(totalComputeSec / 3600)} שעות` +
        (resetAt
          ? ` · איפוס מכסה ${new Date(resetAt).toLocaleDateString("he-IL")}`
          : "") +
        " — צריכה בלבד (Neon לא מחזיר $ ב-API)",
      dashboardUrl: DASHBOARD,
      countsTowardTotal: false,
    };
  } catch (err) {
    return providerError("neon", "Neon", DASHBOARD, err, asOf);
  }
}
