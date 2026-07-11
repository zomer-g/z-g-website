/**
 * DeepSeek — prepaid balance only (GET /user/balance).
 *
 * DeepSeek exposes no historical spend/cost API, only the current balance
 * (granted credits vs topped-up). So this card shows remaining balance, not
 * month-to-date spend, and is excluded from the unified spend total. Balance is
 * typically returned in CNY. Env: DEEPSEEK_API_KEY.
 */

import { getJson, providerError, notConfigured, type ProviderCost } from "./types";

const DASHBOARD = "https://platform.deepseek.com/usage";

interface BalanceInfo {
  currency?: string;
  total_balance?: string;
  granted_balance?: string;
  topped_up_balance?: string;
}
interface BalanceResponse {
  is_available?: boolean;
  balance_infos?: BalanceInfo[];
}

export async function fetchDeepSeek(asOf: string): Promise<ProviderCost> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return notConfigured(
      "deepseek",
      "DeepSeek",
      DASHBOARD,
      "חסר DEEPSEEK_API_KEY",
      asOf,
    );
  }

  try {
    const data = await getJson<BalanceResponse>(
      "https://api.deepseek.com/user/balance",
      { bearer: key },
    );
    const info = data.balance_infos?.[0];
    const currency = (info?.currency || "CNY").toUpperCase();
    const balance = info ? Number(info.total_balance) : null;
    const granted = info ? Number(info.granted_balance) : 0;
    const topped = info ? Number(info.topped_up_balance) : 0;

    return {
      id: "deepseek",
      label: "DeepSeek",
      status: "balance",
      currency,
      currentMonthCost: null,
      balance,
      breakdown: [
        { name: "יתרה שנרכשה", value: topped },
        { name: "קרדיט שהוענק", value: granted },
      ],
      asOf,
      detail:
        data.is_available === false
          ? "החשבון מסומן כלא-זמין ב-DeepSeek"
          : "יתרה נוכחית (DeepSeek לא מספק היסטוריית הוצאה)",
      dashboardUrl: DASHBOARD,
      countsTowardTotal: false,
    };
  } catch (err) {
    return providerError("deepseek", "DeepSeek", DASHBOARD, err, asOf);
  }
}
