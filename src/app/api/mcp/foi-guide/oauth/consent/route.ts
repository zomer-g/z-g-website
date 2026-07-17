import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_CODE_TTL_SECONDS,
  hashToken,
  isAllowedRedirectUri,
  randomToken,
  verifyConsent,
} from "@/lib/mcp-oauth";

// Step 3 of the user-facing flow, and the only place an auth code is minted.
// The consent screen rendered by /callback POSTs here with the signed ticket
// that binds the authorize request to the Google-verified email.
//
// The ticket is the whole authorization: it is unguessable, HMAC-signed,
// short-lived, and carries its own subject, so this endpoint needs no session
// or CSRF token. A forged cross-site POST can only submit a ticket the
// attacker already holds — which mints a code for the attacker's own identity,
// delivered to the attacker's own client. That's not an attack, that's just
// them logging in.

export const dynamic = "force-dynamic";

function errorPage(title: string, body: string, status = 400) {
  return new NextResponse(
    `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${title}</title>
     <style>body{font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px;color:#222}
     h1{color:#b91c1c}</style></head><body><h1>${title}</h1><p>${body}</p></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    },
  );
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const ticketRaw = form.get("ticket");
  const decision = form.get("decision");

  if (typeof ticketRaw !== "string") {
    return errorPage("בקשה לא תקינה", "חסר אסימון אישור.");
  }

  const ticket = verifyConsent(ticketRaw);
  if (!ticket) {
    return errorPage(
      "פג תוקף הבקשה",
      "פג תוקף בקשת האישור. התחל את חיבור ה-MCP מחדש מהכלי שלך.",
    );
  }

  // Never redirect anywhere we wouldn't have accepted at /authorize — the
  // ticket is signed, but signing only proves we issued it, not that the
  // client's registration is still acceptable.
  if (!isAllowedRedirectUri(ticket.redirectUri)) {
    return errorPage("בקשה לא תקינה", "כתובת החזרה אינה מורשית.");
  }
  const redirect = new URL(ticket.redirectUri);
  if (ticket.state) redirect.searchParams.set("state", ticket.state);

  if (decision !== "approve") {
    // RFC 6749 §4.1.2.1 — report the refusal to the client rather than
    // dead-ending the user on our own page.
    redirect.searchParams.set("error", "access_denied");
    redirect.searchParams.set("error_description", "The user denied the request.");
    return NextResponse.redirect(redirect.toString(), { status: 303 });
  }

  // Re-check the invite at approval time; it may have been revoked while the
  // consent screen sat open.
  const invite = await prisma.mcpInvite.findUnique({ where: { email: ticket.email } });
  if (!invite) {
    return errorPage("אין לך גישה", "ההרשאה שלך למדריך חופש המידע בוטלה.", 403);
  }

  // Issue our own auth code. The MCP client will POST it (with the original
  // PKCE verifier) to /token to receive an access token. Only the hash is
  // persisted; the raw code leaves here solely via the redirect below.
  const code = randomToken(32);
  await prisma.mcpOauthAuthCode.create({
    data: {
      codeHash: hashToken(code),
      clientId: ticket.clientId,
      redirectUri: ticket.redirectUri,
      codeChallenge: ticket.codeChallenge,
      codeChallengeMethod: ticket.codeChallengeMethod,
      email: ticket.email,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
    },
  });

  redirect.searchParams.set("code", code);
  // 303 so the browser turns this POST into a GET on the client's callback.
  return NextResponse.redirect(redirect.toString(), { status: 303 });
}
