import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint for the GSC integration.
 * Returns:
 *  - the account row's stored scopes
 *  - the userinfo Google sees for the access token (so we know which account is actually being used)
 *  - the list of GSC properties this token can read
 *  - the configured GSC_SITE_URL and whether it appears in the list
 *
 * Never expose this to non-admins.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No Google account linked" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "OAuth client env missing" }, { status: 500 });
  }

  const oauth2 = new OAuth2Client({ clientId, clientSecret });
  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  const out: Record<string, unknown> = {
    storedScopes: (account.scope ?? "").split(" ").filter(Boolean),
    hasWebmastersScope: (account.scope ?? "").includes(
      "https://www.googleapis.com/auth/webmasters.readonly",
    ),
    expiresAt: account.expires_at,
    sessionEmail: session.user.email,
    gscSiteUrl: process.env.GSC_SITE_URL,
  };

  // Who does Google think this token belongs to?
  try {
    const userinfo = await oauth2.request<{ email?: string; name?: string }>({
      url: "https://openidconnect.googleapis.com/v1/userinfo",
    });
    out.tokenBelongsTo = userinfo.data;
  } catch (err) {
    out.userinfoError = err instanceof Error ? err.message : String(err);
  }

  // Which GSC properties can this token read?
  try {
    const sites = await oauth2.request<{
      siteEntry?: Array<{ siteUrl: string; permissionLevel: string }>;
    }>({
      url: "https://searchconsole.googleapis.com/webmasters/v3/sites",
    });
    const list = sites.data.siteEntry ?? [];
    out.gscSitesVisible = list;
    out.requestedSiteFoundInList = list.some(
      (s) => s.siteUrl === process.env.GSC_SITE_URL,
    );
  } catch (err) {
    out.gscSitesError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(out);
}
