/**
 * OpenAI — month-to-date spend via the Costs API (GET /v1/organization/costs).
 *
 * IMPORTANT: this endpoint requires an **Admin key** (created under
 * Organization → Admin keys), NOT a regular `sk-proj-…` project key. A project
 * key returns 401 "Missing scopes: api.usage.read". Env: OPENAI_ADMIN_KEY
 * (kept separate from the existing OPENAI_API_KEY used for model calls).
 */

import {
  getJson,
  providerError,
  notConfigured,
  startOfMonthUTC,
  type ProviderCost,
} from "./types";

const DASHBOARD = "https://platform.openai.com/settings/organization/usage";

interface CostAmount {
  value?: number;
  currency?: string;
}
interface CostResult {
  amount?: CostAmount;
  line_item?: string | null;
  project_id?: string | null;
}
interface CostBucket {
  results?: CostResult[];
}
interface CostsResponse {
  data?: CostBucket[];
  has_more?: boolean;
  next_page?: string | null;
}

export async function fetchOpenAI(asOf: string): Promise<ProviderCost> {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) {
    return notConfigured(
      "openai",
      "OpenAI",
      DASHBOARD,
      "חסר OPENAI_ADMIN_KEY — צריך Admin key (Organization → Admin keys), לא מפתח פרויקט",
      asOf,
    );
  }

  try {
    const startTime = Math.floor(startOfMonthUTC().getTime() / 1000);
    let total = 0;
    let currency = "USD";
    const byLineItem = new Map<string, number>();

    let page: string | null = null;
    // A month is ≤31 daily buckets; cap the page walk defensively.
    for (let i = 0; i < 5; i++) {
      const url = new URL("https://api.openai.com/v1/organization/costs");
      url.searchParams.set("start_time", String(startTime));
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.set("limit", "31");
      url.searchParams.set("group_by", "line_item");
      if (page) url.searchParams.set("page", page);

      const data: CostsResponse = await getJson<CostsResponse>(url.toString(), {
        bearer: key,
        timeoutMs: 20_000,
      });
      for (const bucket of data.data ?? []) {
        for (const r of bucket.results ?? []) {
          const v = r.amount?.value ?? 0;
          total += v;
          if (r.amount?.currency) currency = r.amount.currency.toUpperCase();
          const li = r.line_item || "כללי";
          byLineItem.set(li, (byLineItem.get(li) ?? 0) + v);
        }
      }
      if (!data.has_more || !data.next_page) break;
      page = data.next_page;
    }

    const breakdown = [...byLineItem.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      id: "openai",
      label: "OpenAI",
      status: "ok",
      currency,
      currentMonthCost: total,
      breakdown,
      asOf,
      detail: "הוצאה מצטברת מתחילת החודש (Costs API)",
      dashboardUrl: DASHBOARD,
      countsTowardTotal: currency === "USD",
    };
  } catch (err) {
    return providerError("openai", "OpenAI", DASHBOARD, err, asOf);
  }
}
