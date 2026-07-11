/**
 * Cloudflare — real billed amounts via the (GET) billing history endpoint.
 *
 * Cloudflare bills in arrears: `/user/billing/history` returns closed monthly
 * invoices with their USD amount. There is no reliable "current MTD accrual"
 * figure in the public API, so we surface the most recent invoice as the
 * representative monthly cost and expose the last few as a history breakdown.
 *
 * Credential: an API Token scoped to **Billing → Read** only. Env:
 *   CLOUDFLARE_BILLING_TOKEN, CLOUDFLARE_ACCOUNT_ID (account id is optional —
 *   the /user/billing/history call is user-scoped).
 */

import { getJson, providerError, notConfigured, type ProviderCost } from "./types";

const DASHBOARD = "https://dash.cloudflare.com/?to=/:account/billing";

interface CfInvoice {
  id: string;
  type: string;
  occurred_at: string;
  amount?: number;
  amount_to_pay?: number;
  currency?: string;
  status?: string;
}

interface CfHistoryResponse {
  success: boolean;
  result?: CfInvoice[];
  errors?: { code: number; message: string }[];
}

export async function fetchCloudflare(asOf: string): Promise<ProviderCost> {
  const token = process.env.CLOUDFLARE_BILLING_TOKEN;
  if (!token) {
    return notConfigured(
      "cloudflare",
      "Cloudflare",
      DASHBOARD,
      "חסר CLOUDFLARE_BILLING_TOKEN (טוקן עם הרשאת Billing → Read בלבד)",
      asOf,
    );
  }

  try {
    const data = await getJson<CfHistoryResponse>(
      "https://api.cloudflare.com/client/v4/user/billing/history?per_page=6&order=occurred_at&direction=desc",
      { bearer: token },
    );
    if (!data.success) {
      const msg = data.errors?.map((e) => e.message).join("; ") || "בקשה נכשלה";
      throw new Error(msg);
    }
    const invoices = (data.result ?? []).filter((i) => i.type === "invoice");
    // `amount` is the invoiced sum; `amount_to_pay` can be 0 when prepaid/credited.
    const amountOf = (i: CfInvoice) =>
      typeof i.amount === "number" ? i.amount : (i.amount_to_pay ?? 0);

    // The newest entry is often the current, not-yet-closed cycle with no
    // `amount` (shows as 0) — not a useful headline. Represent the provider by
    // the most recent invoice that carries a real `amount` (the last actual
    // charge), falling back to the newest entry if none has one.
    const latestCharged =
      invoices.find((i) => typeof i.amount === "number") ?? invoices[0];
    const currency = (latestCharged?.currency || "usd").toUpperCase();

    return {
      id: "cloudflare",
      label: "Cloudflare",
      status: "ok",
      currency,
      currentMonthCost: latestCharged ? amountOf(latestCharged) : null,
      lastInvoiceAmount: latestCharged ? amountOf(latestCharged) : null,
      lastInvoiceDate: latestCharged?.occurred_at ?? null,
      breakdown: invoices.slice(0, 6).map((i) => ({
        name: new Date(i.occurred_at).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "short",
        }),
        value: amountOf(i),
      })),
      asOf,
      detail: "חשבונית חודשית אחרונה (Cloudflare מחייב בדיעבד)",
      dashboardUrl: DASHBOARD,
      countsTowardTotal: currency === "USD",
    };
  } catch (err) {
    return providerError("cloudflare", "Cloudflare", DASHBOARD, err, asOf);
  }
}
