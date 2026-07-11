/**
 * Google / Gemini — cost via a BigQuery billing export (phase 3, not yet wired).
 *
 * Gemini API usage is billed through Google Cloud Billing. The only accurate
 * way to read $ programmatically is to enable "Billing export → BigQuery" (a
 * one-time setup on the Google side) and query the `gcp_billing_export_v1_*`
 * table with a read-only service account (roles/bigquery.dataViewer +
 * jobUser), filtering to the Generative Language / Gemini SKUs.
 *
 * This is deferred until:
 *   1. Billing export to BigQuery is enabled in the GCP console, and
 *   2. `@google-cloud/bigquery` is installed (npm i @google-cloud/bigquery).
 *
 * Env (all required to activate): GCP_BILLING_BQ_PROJECT, GCP_BILLING_BQ_DATASET,
 * GCP_BILLING_BQ_TABLE, GCP_SA_KEY_JSON.
 *
 * Until then this returns a uniform "not-configured" card so the page has a
 * placeholder slot for Gemini.
 */

import { notConfigured, providerError, type ProviderCost } from "./types";

const DASHBOARD = "https://console.cloud.google.com/billing";

export async function fetchGoogleGemini(asOf: string): Promise<ProviderCost> {
  const project = process.env.GCP_BILLING_BQ_PROJECT;
  const dataset = process.env.GCP_BILLING_BQ_DATASET;
  const table = process.env.GCP_BILLING_BQ_TABLE;
  const saKey = process.env.GCP_SA_KEY_JSON;

  if (!project || !dataset || !table || !saKey) {
    return notConfigured(
      "google-gemini",
      "Google / Gemini",
      DASHBOARD,
      "דורש הפעלת Billing export ל-BigQuery + התקנת @google-cloud/bigquery (פאזה 3)",
      asOf,
    );
  }

  // Env is present but the BigQuery client isn't a dependency yet. Surface a
  // clear, actionable error rather than crashing the build with a static import.
  return providerError(
    "google-gemini",
    "Google / Gemini",
    DASHBOARD,
    "הרץ `npm i @google-cloud/bigquery` ואז השלם את שאילתת ה-BigQuery ב-google-gemini.ts",
    asOf,
  );
}
