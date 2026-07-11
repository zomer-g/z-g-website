/**
 * Render — ESTIMATED monthly cost from service plan tiers.
 *
 * Render has NO billing/cost API and NO read-only key (a Render API key is
 * full-access to the account) — so real spend can't be pulled. Instead we list
 * services (GET /v1/services) and map each running service's instance plan to
 * Render's published list price, summing to a monthly estimate. This is an
 * approximation: it ignores usage-based add-ons (bandwidth, extra disk,
 * pipeline minutes) and any custom/discounted pricing. The authoritative number
 * is always the Render dashboard.
 *
 * Credential: RENDER_API_KEY (full-access; this fetcher only GETs).
 */

import { getJson, providerError, notConfigured, type ProviderCost } from "./types";

const DASHBOARD = "https://dashboard.render.com/billing";

// Render published list prices (USD/month), as of 2025-2026. Free tiers and
// static sites cost $0. Keep in sync with https://render.com/pricing.
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 7,
  standard: 25,
  pro: 85,
  pro_plus: 175,
  pro_max: 225,
  pro_ultra: 450,
};

interface RenderService {
  id: string;
  name: string;
  type: string; // web_service | static_site | cron_job | ...
  suspended?: string; // "suspended" | "not_suspended"
  dashboardUrl?: string;
  serviceDetails?: {
    plan?: string;
    buildPlan?: string;
    numInstances?: number;
  };
}

interface RenderServiceEnvelope {
  service: RenderService;
}

export async function fetchRender(asOf: string): Promise<ProviderCost> {
  const key = process.env.RENDER_API_KEY;
  if (!key) {
    return notConfigured(
      "render",
      "Render",
      DASHBOARD,
      "חסר RENDER_API_KEY",
      asOf,
    );
  }

  try {
    const envelopes = await getJson<RenderServiceEnvelope[]>(
      "https://api.render.com/v1/services?limit=100",
      { bearer: key },
    );
    const services = envelopes.map((e) => e.service).filter(Boolean);

    let estimate = 0;
    const breakdown = services
      .filter((s) => s.type !== "static_site" && s.suspended !== "suspended")
      .map((s) => {
        const plan = (s.serviceDetails?.plan || "").toLowerCase();
        const instances = s.serviceDetails?.numInstances ?? 1;
        const unit = PLAN_PRICES[plan];
        const cost = unit != null ? unit * instances : 0;
        estimate += cost;
        return {
          name: `${s.name} (${plan || "?"}${instances > 1 ? ` ×${instances}` : ""})`,
          value: cost,
        };
      });

    const unknownPlans = services.some((s) => {
      if (s.type === "static_site" || s.suspended === "suspended") return false;
      const plan = (s.serviceDetails?.plan || "").toLowerCase();
      return !(plan in PLAN_PRICES);
    });

    return {
      id: "render",
      label: "Render",
      status: "estimated",
      currency: "USD",
      currentMonthCost: estimate,
      breakdown,
      asOf,
      detail:
        `צפי חודשי (הערכה) — סכום תוכניות ה-instance של ${services.length} שירותים` +
        (unknownPlans ? " (חלק מהתוכניות לא מוכרות — לא נכללות)" : "") +
        ". לא כולל תוספות לפי שימוש (bandwidth/דיסק). ל-Render אין API לעלות אמיתית.",
      dashboardUrl: DASHBOARD,
      // Estimate, not real spend — kept out of the unified "real cost" total.
      countsTowardTotal: false,
    };
  } catch (err) {
    return providerError("render", "Render", DASHBOARD, err, asOf);
  }
}
