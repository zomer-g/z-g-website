import { JWT, OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";

/**
 * Google Search Console (Search Analytics) client.
 *
 * Primary auth: OAuth via the signed-in admin's Google account (NextAuth stores
 * access/refresh tokens in the Account table). The admin must already be a
 * verified owner of the GSC property — no extra grants needed.
 *
 * Fallback auth: service account JSON in env (kept for setups where the
 * Workspace allows adding SAs as GSC users — personal Gmail accounts can't,
 * which is why OAuth is the default).
 *
 * Env:
 *   GSC_SITE_URL              — the verified property URL, e.g. "https://z-g.co.il/"
 *                                or "sc-domain:z-g.co.il" for Domain properties
 *   GSC_SERVICE_ACCOUNT_JSON  — (optional) raw JSON of a SA key with GSC access
 */

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscQueryArgs = {
  startDate: string;
  endDate: string;
  dimensions?: Array<"query" | "page" | "country" | "device" | "date">;
  rowLimit?: number;
  startRow?: number;
  searchType?: "web" | "image" | "video" | "news";
};

export type GscAuthClient = JWT | OAuth2Client;

export type GscConfig = {
  siteUrl: string;
  client: GscAuthClient;
};

/* ── Service account path (fallback) ── */

function readServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  let parsed: { client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed.client_email || !parsed.private_key) return null;
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

function buildServiceAccountClient(): JWT | null {
  const sa = readServiceAccount();
  if (!sa) return null;
  return new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [GSC_SCOPE],
  });
}

/* ── OAuth path (primary) ── */

type AccountTokens = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
};

async function getGoogleAccountForUser(userId: string): Promise<AccountTokens | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });
  return account;
}

async function buildOAuthClientForUser(userId: string): Promise<OAuth2Client | null> {
  const account = await getGoogleAccountForUser(userId);
  if (!account?.access_token) return null;

  const hasScope = (account.scope ?? "").split(" ").includes(GSC_SCOPE);
  if (!hasScope) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const oauth2 = new OAuth2Client({ clientId, clientSecret });
  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Persist refreshed tokens back to the DB so they outlive this request.
  oauth2.on("tokens", (tokens) => {
    void prisma.account
      .update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token ?? undefined,
          refresh_token: tokens.refresh_token ?? undefined,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : undefined,
        },
      })
      .catch((err) => {
        console.error("Failed to persist refreshed Google tokens:", err);
      });
  });

  return oauth2;
}

/* ── Resolve a config ── */

export type GscAuthInput = { userId?: string };

export async function getGscConfig(input?: GscAuthInput): Promise<GscConfig> {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) {
    throw new Error(
      'GSC_SITE_URL is not set. Use the exact property URL from Search Console (e.g. "https://z-g.co.il/" or "sc-domain:z-g.co.il").',
    );
  }

  if (input?.userId) {
    const oauth = await buildOAuthClientForUser(input.userId);
    if (oauth) return { siteUrl, client: oauth };
  }

  const sa = buildServiceAccountClient();
  if (sa) return { siteUrl, client: sa };

  throw new Error(
    "GSC not authenticated. Sign in again with Google so the new webmasters.readonly permission is granted, or set GSC_SERVICE_ACCOUNT_JSON for a Workspace account.",
  );
}

export function isGscConfigured(): boolean {
  return Boolean(process.env.GSC_SITE_URL);
}

/* ── Diagnostics for the admin page ── */

export type GscAuthStatus =
  | { kind: "no-site-url" }
  | { kind: "user-missing-scope"; signInRequired: true }
  | { kind: "user-oauth" }
  | { kind: "service-account" };

export async function getGscAuthStatus(userId?: string): Promise<GscAuthStatus> {
  if (!process.env.GSC_SITE_URL) return { kind: "no-site-url" };
  if (userId) {
    const account = await getGoogleAccountForUser(userId);
    const hasScope = (account?.scope ?? "").split(" ").includes(GSC_SCOPE);
    if (account?.access_token && hasScope) return { kind: "user-oauth" };
  }
  if (buildServiceAccountClient()) return { kind: "service-account" };
  return { kind: "user-missing-scope", signInRequired: true };
}

/* ── Search Analytics calls ── */

export async function querySearchAnalytics(
  args: GscQueryArgs,
  config: GscConfig,
): Promise<GscRow[]> {
  const { siteUrl, client } = config;
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const body = {
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: args.dimensions ?? ["query"],
    rowLimit: args.rowLimit ?? 1000,
    startRow: args.startRow ?? 0,
    searchType: args.searchType ?? "web",
  };

  const res = await client.request<{ rows?: GscRow[] }>({
    url,
    method: "POST",
    data: body,
  });

  return res.data.rows ?? [];
}

/* ── Helpers for the admin page ── */

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export type OpportunityRow = {
  query: string;
  page: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  potential: number;
};

export async function fetchOpportunities(
  config: GscConfig,
  opts: { days?: number; minImpressions?: number; limit?: number } = {},
): Promise<OpportunityRow[]> {
  const days = opts.days ?? 28;
  const minImpressions = opts.minImpressions ?? 20;
  const limit = opts.limit ?? 50;

  const rows = await querySearchAnalytics(
    {
      startDate: isoDaysAgo(days + 3),
      endDate: isoDaysAgo(3),
      dimensions: ["query", "page"],
      rowLimit: 5000,
    },
    config,
  );

  const filtered = rows.filter(
    (r) =>
      r.impressions >= minImpressions &&
      r.position >= 5 &&
      r.position <= 25,
  );

  const ctrAtRank = (pos: number): number => {
    if (pos <= 1) return 0.28;
    if (pos <= 2) return 0.15;
    if (pos <= 3) return 0.1;
    if (pos <= 5) return 0.06;
    if (pos <= 10) return 0.025;
    return 0.008;
  };

  const enriched: OpportunityRow[] = filtered.map((r) => {
    const targetCtr = ctrAtRank(3);
    const potential = Math.max(0, Math.round(r.impressions * targetCtr - r.clicks));
    return {
      query: r.keys[0] ?? "",
      page: r.keys[1] ?? null,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      potential,
    };
  });

  enriched.sort((a, b) => b.potential - a.potential);
  return enriched.slice(0, limit);
}

export type LowCtrRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function fetchLowCtrTopRanks(
  config: GscConfig,
  opts: { days?: number; minImpressions?: number; limit?: number } = {},
): Promise<LowCtrRow[]> {
  const days = opts.days ?? 28;
  const minImpressions = opts.minImpressions ?? 100;
  const limit = opts.limit ?? 30;

  const rows = await querySearchAnalytics(
    {
      startDate: isoDaysAgo(days + 3),
      endDate: isoDaysAgo(3),
      dimensions: ["query"],
      rowLimit: 5000,
    },
    config,
  );

  const expectedCtrTop10 = 0.03;
  const candidates = rows.filter(
    (r) =>
      r.impressions >= minImpressions &&
      r.position <= 10 &&
      r.ctr < expectedCtrTop10,
  );

  candidates.sort((a, b) => b.impressions - a.impressions);

  return candidates.slice(0, limit).map((r) => ({
    query: r.keys[0] ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}

export type TopPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function fetchTopPages(
  config: GscConfig,
  opts: { days?: number; limit?: number } = {},
): Promise<TopPageRow[]> {
  const days = opts.days ?? 28;
  const limit = opts.limit ?? 30;

  const rows = await querySearchAnalytics(
    {
      startDate: isoDaysAgo(days + 3),
      endDate: isoDaysAgo(3),
      dimensions: ["page"],
      rowLimit: 1000,
    },
    config,
  );

  rows.sort((a, b) => b.impressions - a.impressions);

  return rows.slice(0, limit).map((r) => ({
    page: r.keys[0] ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}
