/**
 * Aggregator for the billing dashboard. Fans out to every provider fetcher in
 * parallel with graceful degradation (one provider failing yields an error
 * card, never a broken page), and caches the whole snapshot in memory for a
 * short TTL — Neon recommends ≥15 min between consumption calls and the OpenAI
 * Costs API isn't free to poll. A `refresh` flag bypasses the cache.
 */

import type { ProviderCost } from "./types";
import { fetchCloudflare } from "./cloudflare";
import { fetchNeon } from "./neon";
import { fetchRender } from "./render";
import { fetchOpenAI } from "./openai";
import { fetchDeepSeek } from "./deepseek";
import { fetchGoogleGemini } from "./google-gemini";

export interface BillingSnapshot {
  providers: ProviderCost[];
  /** Unified total of real USD spend (only `status:ok` + countsTowardTotal + USD). */
  totalUsd: number;
  /** ids included in `totalUsd`, so the UI can explain what's summed. */
  totalIncludes: string[];
  generatedAt: string;
  cached: boolean;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes
let cache: { snapshot: BillingSnapshot; at: number } | null = null;

export async function getBillingSnapshot(refresh = false): Promise<BillingSnapshot> {
  if (!refresh && cache && Date.now() - cache.at < TTL_MS) {
    return { ...cache.snapshot, cached: true };
  }

  const asOf = new Date().toISOString();
  const fetchers = [
    fetchCloudflare,
    fetchOpenAI,
    fetchNeon,
    fetchRender,
    fetchDeepSeek,
    fetchGoogleGemini,
  ];

  const results = await Promise.allSettled(fetchers.map((f) => f(asOf)));
  const providers: ProviderCost[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    // A fetcher should never throw (each catches internally), but guard anyway.
    return {
      id: `provider-${i}`,
      label: "ספק לא ידוע",
      status: "error" as const,
      currency: null,
      currentMonthCost: null,
      asOf,
      detail: String((r as PromiseRejectedResult).reason).slice(0, 200),
      dashboardUrl: "",
      countsTowardTotal: false,
    };
  });

  const counted = providers.filter(
    (p) => p.countsTowardTotal && p.status === "ok" && p.currency === "USD",
  );
  const totalUsd = counted.reduce((s, p) => s + (p.currentMonthCost ?? 0), 0);

  const snapshot: BillingSnapshot = {
    providers,
    totalUsd,
    totalIncludes: counted.map((p) => p.id),
    generatedAt: asOf,
    cached: false,
  };
  cache = { snapshot, at: Date.now() };
  return snapshot;
}
