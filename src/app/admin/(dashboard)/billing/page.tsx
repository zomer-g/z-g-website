"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Wallet,
  AlertCircle,
} from "lucide-react";

/* ─── Types (mirror src/lib/billing) ─── */

type ProviderStatus =
  | "ok"
  | "estimated"
  | "balance"
  | "usage"
  | "not-configured"
  | "error";

interface ProviderBreakdownItem {
  name: string;
  value: number;
  unit?: string;
}
interface ProviderCost {
  id: string;
  label: string;
  status: ProviderStatus;
  currency: string | null;
  currentMonthCost: number | null;
  lastInvoiceAmount?: number | null;
  lastInvoiceDate?: string | null;
  balance?: number | null;
  breakdown?: ProviderBreakdownItem[];
  asOf: string;
  detail?: string;
  dashboardUrl: string;
  countsTowardTotal: boolean;
}
interface BillingSnapshot {
  providers: ProviderCost[];
  totalUsd: number;
  totalIncludes: string[];
  generatedAt: string;
  cached: boolean;
}

/* ─── Formatting helpers ─── */

function money(value: number, currency: string | null): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function bytes(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} GB`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} MB`;
  return `${v} B`;
}

function breakdownValue(item: ProviderBreakdownItem, currency: string | null): string {
  if (item.unit === "storage") return bytes(item.value);
  if (item.unit === "compute") return `${Math.round(item.value / 3600)} שעות`;
  return money(item.value, currency);
}

const STATUS_META: Record<
  ProviderStatus,
  { label: string; variant: "success" | "accent" | "default" | "muted" | "error" }
> = {
  ok: { label: "עלות בפועל", variant: "success" },
  estimated: { label: "הערכה", variant: "accent" },
  balance: { label: "יתרה", variant: "default" },
  usage: { label: "צריכה", variant: "default" },
  "not-configured": { label: "לא מוגדר", variant: "muted" },
  error: { label: "שגיאה", variant: "error" },
};

/* ─── Provider Card ─── */

function ProviderCard({ p }: { p: ProviderCost }) {
  const meta = STATUS_META[p.status];
  const isEstimate = p.status === "estimated";

  // Headline figure depends on what the provider actually reports. Estimates
  // are prefixed with "≈" so the number itself signals it isn't verified.
  let headline: string;
  if (p.status === "balance" && p.balance != null) {
    headline = money(p.balance, p.currency);
  } else if (p.currentMonthCost != null) {
    headline = `${isEstimate ? "≈ " : ""}${money(p.currentMonthCost, p.currency)}`;
  } else if (p.status === "usage") {
    headline = "צריכה";
  } else {
    headline = "—";
  }

  return (
    <Card
      className={cn(
        "overflow-hidden",
        p.status === "error" && "border-error/40",
        // Clear frame around anything that is an ESTIMATE, not verified data.
        isEstimate && "border-2 border-dashed border-accent",
      )}
    >
      {/* Estimate ribbon — unmistakable "not verified" marker. */}
      {isEstimate && (
        <div className="flex items-center gap-1.5 bg-accent/15 px-5 py-1.5 text-[11px] font-bold text-primary-dark">
          <AlertCircle size={13} className="shrink-0" />
          הערכה — לא נתון מאומת
        </div>
      )}
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-primary-dark">{p.label}</h3>
            <p className="mt-0.5 text-2xl font-extrabold text-foreground">
              {headline}
            </p>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>

        {p.breakdown && p.breakdown.length > 0 && p.status !== "not-configured" && (
          <ul className="flex flex-col gap-1 border-t border-border pt-2 text-xs">
            {p.breakdown.slice(0, 6).map((b, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted">{b.name}</span>
                <span className="shrink-0 font-medium text-foreground">
                  {breakdownValue(b, p.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {p.detail && (
          <p
            className={cn(
              "text-xs leading-relaxed",
              p.status === "error" ? "text-error" : "text-muted",
            )}
          >
            {p.status === "error" && (
              <AlertCircle size={12} className="ml-1 inline-block align-[-1px]" />
            )}
            {p.detail}
          </p>
        )}

        <a
          href={p.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink size={12} />
          לדשבורד הרשמי
        </a>
      </CardContent>
    </Card>
  );
}

/* ─── Page ─── */

export default function BillingPage() {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `שגיאה ${res.status}`);
      }
      setSnapshot(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const includedLabels =
    snapshot?.providers
      .filter((p) => snapshot.totalIncludes.includes(p.id))
      .map((p) => p.label) ?? [];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">עלויות ותקציב</h1>
          <p className="mt-1 text-sm text-muted">
            מעקב קריאה-בלבד אחר החיובים בכל השירותים
            {snapshot && (
              <>
                {" · "}
                עודכן{" "}
                {new Date(snapshot.generatedAt).toLocaleString("he-IL")}
                {snapshot.cached && " (מטמון)"}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground",
            "hover:bg-muted-bg transition-colors duration-150 disabled:opacity-50",
          )}
        >
          <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
          <span>רענון</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-error/40 bg-error/5 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* ── Unified Total ── */}
      {snapshot && (
        <Card className="bg-primary-dark text-white">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
                <Wallet size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-white/70">סה״כ הוצאה בפועל החודש (USD)</p>
                <p className="text-3xl font-extrabold">
                  {money(snapshot.totalUsd, "USD")}
                </p>
              </div>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-white/60">
              {includedLabels.length > 0
                ? `כולל נתוני עלות מאומתים בלבד: ${includedLabels.join(", ")}. `
                : "אין עדיין ספק עם עלות בפועל מאומתת ב-USD. "}
              יתרות (DeepSeek) והערכות (Render, Neon) מסומנות במסגרת ומוצגות בנפרד — אינן נכללות בסכום.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Provider Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {snapshot?.providers.map((p) => (
          <ProviderCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
