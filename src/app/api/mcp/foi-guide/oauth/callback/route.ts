import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_CODE_TTL_SECONDS,
  MCP_OAUTH_BASE_PATH,
  originFromRequest,
  randomToken,
  verifyState,
} from "@/lib/mcp-oauth";

// Step 2 of the user-facing flow. Google sends the user back here with
// `code` (Google's auth code) + `state` (our signed AuthorizeState).
// We:
//   1. Verify state.
//   2. Exchange Google's code for an ID token + email.
//   3. Check email against McpInvite. If absent → 403 page.
//   4. Issue our own auth code (random token, stored in McpOauthAuthCode)
//      and redirect the user back to the MCP client's redirect_uri.

export const dynamic = "force-dynamic";

function errorPage(title: string, body: string, status = 400) {
  return new NextResponse(
    `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${title}</title>
     <style>body{font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px;color:#222}
     h1{color:#b91c1c}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>
     </head><body><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  sub?: string;
}

async function fetchGoogleEmail(
  code: string,
  redirectUri: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID_PUBLIC ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET_PUBLIC ?? "",
    // Must match the redirect_uri we sent at /authorize time, otherwise
    // Google returns redirect_uri_mismatch.
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!tokRes.ok) {
    console.error("Google token exchange failed:", await tokRes.text());
    return null;
  }
  const tok = (await tokRes.json()) as GoogleTokenResponse;
  if (!tok.access_token) return null;

  const uiRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  if (!uiRes.ok) return null;
  const ui = (await uiRes.json()) as GoogleUserInfo;
  if (!ui.email || ui.email_verified === false) return null;
  return ui.email.toLowerCase();
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const googleCode = params.get("code");
  const stateRaw = params.get("state");
  const googleError = params.get("error");

  if (googleError) {
    return errorPage(
      "ההזדהות נכשלה",
      `שגיאת Google: <code>${googleError}</code>. נסה שוב מהכלי שלך.`,
    );
  }
  if (!googleCode || !stateRaw) {
    return errorPage("בקשה לא תקינה", "חסרים פרמטרים מ-Google.");
  }

  const state = verifyState(stateRaw);
  if (!state) {
    return errorPage(
      "ההזדהות פגה",
      "פג תוקף בקשת ההזדהות (state). נסה להתחיל את חיבור ה-MCP מחדש.",
    );
  }

  const redirectUri = `${originFromRequest(req)}${MCP_OAUTH_BASE_PATH}/callback`;
  const email = await fetchGoogleEmail(googleCode, redirectUri);
  if (!email) {
    return errorPage(
      "ההזדהות נכשלה",
      "לא הצלחנו לאמת את כתובת האימייל שלך מול Google.",
      401,
    );
  }

  const invite = await prisma.mcpInvite.findUnique({ where: { email } });
  if (!invite) {
    return errorPage(
      "אין לך גישה",
      `הכתובת <code>${email}</code> אינה ברשימת המוזמנים של מדריך חופש המידע. ` +
        "פנה למנהל האתר כדי לקבל הזמנה.",
      403,
    );
  }

  // Issue our own auth code. The MCP client will POST it (with the original
  // PKCE verifier) to /token to receive an access token.
  const code = randomToken(32);
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000);
  await prisma.mcpOauthAuthCode.create({
    data: {
      code,
      clientId: state.clientId,
      redirectUri: state.redirectUri,
      codeChallenge: state.codeChallenge,
      codeChallengeMethod: state.codeChallengeMethod,
      email,
      expiresAt,
    },
  });

  const redirect = new URL(state.redirectUri);
  redirect.searchParams.set("code", code);
  if (state.state) redirect.searchParams.set("state", state.state);

  return NextResponse.redirect(redirect.toString());
}
