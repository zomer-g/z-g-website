import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MCP_OAUTH_BASE_PATH,
  originFromRequest,
  signConsent,
  verifyState,
} from "@/lib/mcp-oauth";

// The consent ticket only has to survive the user reading one screen.
const CONSENT_TTL_SECONDS = 10 * 60;

// Step 2 of the user-facing flow. Google sends the user back here with
// `code` (Google's auth code) + `state` (our signed AuthorizeState).
// We:
//   1. Verify state.
//   2. Exchange Google's code for an ID token + email.
//   3. Check email against McpInvite. If absent → 403 page.
//   4. Issue our own auth code (random token, stored in McpOauthAuthCode)
//      and redirect the user back to the MCP client's redirect_uri.

export const dynamic = "force-dynamic";

// Escape any value interpolated into the HTML error pages below. `error` is a
// fully attacker-controlled query param and `email` comes from an external
// IdP, so neither may reach the markup raw (reflected XSS).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function errorPage(title: string, body: string, status = 400) {
  return new NextResponse(
    `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${title}</title>
     <style>body{font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px;color:#222}
     h1{color:#b91c1c}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>
     </head><body><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// The approval screen. Everything identifying the requester — client_name and
// redirect_uri — is self-declared by whoever registered the client, so the
// page says so plainly and shows the redirect host on its own line: the host
// is the part that actually determines who receives the access, and it's the
// part a lookalike name is meant to distract from.
function consentPage(
  ticket: string,
  info: { email: string; clientName: string | null; redirectUri: string },
) {
  const name = info.clientName?.trim() || "(ללא שם)";
  let host = info.redirectUri;
  try {
    host = new URL(info.redirectUri).host;
  } catch {
    /* validated upstream; fall back to the raw string */
  }

  return new NextResponse(
    `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <meta name="robots" content="noindex">
     <title>אישור גישה — מדריך חופש המידע</title>
     <style>
       body{font-family:system-ui;max-width:560px;margin:60px auto;padding:0 20px;color:#222;line-height:1.6}
       h1{font-size:1.5rem}
       .card{border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;background:#f9fafb;margin:24px 0}
       .row{display:flex;gap:10px;margin:8px 0}
       .row .k{color:#6b7280;min-width:90px}
       .row .v{font-weight:600;word-break:break-all}
       .warn{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;font-size:.9rem}
       .actions{display:flex;gap:12px;margin-top:28px}
       button{font:inherit;padding:10px 22px;border-radius:8px;cursor:pointer;border:1px solid transparent}
       .approve{background:#1d4ed8;color:#fff}
       .deny{background:#fff;border-color:#d1d5db;color:#374151}
       code{background:#f3f4f6;padding:2px 6px;border-radius:4px}
     </style></head><body>
     <h1>אישור גישה למדריך חופש המידע</h1>
     <p>האפליקציה הבאה מבקשת גישה לחיפוש במדריך חופש המידע בשמך, כ־<code>${escapeHtml(info.email)}</code>.</p>
     <div class="card">
       <div class="row"><span class="k">שם היישום</span><span class="v">${escapeHtml(name)}</span></div>
       <div class="row"><span class="k">יישלח אל</span><span class="v">${escapeHtml(host)}</span></div>
       <div class="row"><span class="k">כתובת מלאה</span><span class="v">${escapeHtml(info.redirectUri)}</span></div>
     </div>
     <p class="warn">שם היישום והכתובת נמסרו על ידי המבקש ואינם מאומתים על ידינו.
     אם אינך מזהה את הכתובת שאליה תישלח הגישה — אל תאשר.</p>
     <form method="POST" action="${MCP_OAUTH_BASE_PATH}/consent">
       <input type="hidden" name="ticket" value="${escapeHtml(ticket)}">
       <div class="actions">
         <button class="approve" type="submit" name="decision" value="approve">אישור</button>
         <button class="deny" type="submit" name="decision" value="deny">ביטול</button>
       </div>
     </form>
     </body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
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
      `שגיאת Google: <code>${escapeHtml(googleError)}</code>. נסה שוב מהכלי שלך.`,
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
      `הכתובת <code>${escapeHtml(email)}</code> אינה ברשימת המוזמנים של מדריך חופש המידע. ` +
        "פנה למנהל האתר כדי לקבל הזמנה.",
      403,
    );
  }

  // Authenticated and invited — but not yet authorized. Google proved *who
  // the user is*; it did not ask whether they meant to hand this particular
  // client access. Without that question a phishing link lands the user on a
  // real Google screen and back out with a code, having agreed to nothing.
  // So we stop here and render the consent screen; POST /consent is the only
  // place an auth code gets minted.
  const client = await prisma.mcpOauthClient.findUnique({
    where: { clientId: state.clientId },
  });

  const ticket = signConsent({
    ...state,
    email,
    clientName: client?.clientName ?? null,
    exp: Math.floor(Date.now() / 1000) + CONSENT_TTL_SECONDS,
  });

  return consentPage(ticket, {
    email,
    clientName: client?.clientName ?? null,
    redirectUri: state.redirectUri,
  });
}
