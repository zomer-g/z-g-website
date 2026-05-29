import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  originFromRequest,
  signState,
  MCP_OAUTH_BASE_PATH,
  type AuthorizeState,
} from "@/lib/mcp-oauth";

// Step 1 of the user-facing flow.
// The MCP client sends the user here with PKCE params + the client's
// redirect_uri. We validate the request, save the params into a signed
// `state` token, then redirect to Google OAuth. After Google calls our
// /callback endpoint we issue an auth code and bounce the user back to
// the original client.

export const dynamic = "force-dynamic";

const STATE_TTL_SECONDS = 10 * 60;

function badRequest(msg: string) {
  return new NextResponse(`<h1>400 Bad Request</h1><p>${msg}</p>`, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const responseType = params.get("response_type") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "";
  const clientState = params.get("state") ?? undefined;
  const scope = params.get("scope") ?? undefined;

  if (responseType !== "code") {
    return badRequest("response_type must be 'code'");
  }
  if (!clientId || !redirectUri || !codeChallenge) {
    return badRequest("Missing required parameters");
  }
  if (codeChallengeMethod !== "S256") {
    return badRequest("code_challenge_method must be 'S256'");
  }

  const client = await prisma.mcpOauthClient.findUnique({
    where: { clientId },
  });
  if (!client) return badRequest("Unknown client_id");
  if (!client.redirectUris.includes(redirectUri)) {
    return badRequest("redirect_uri not registered for this client");
  }

  const state: AuthorizeState = {
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    state: clientState,
    scope,
    nonce: Math.random().toString(36).slice(2),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };
  const signedState = signState(state);

  const googleClientId = process.env.GOOGLE_CLIENT_ID_PUBLIC;
  if (!googleClientId) {
    return badRequest(
      "Server misconfigured: GOOGLE_CLIENT_ID_PUBLIC is not set. MCP OAuth depends on the public Google client.",
    );
  }

  // Send the user to Google's OAuth screen. We embed our signed `state`
  // as Google's state so it round-trips back to /callback intact.
  const googleAuth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuth.searchParams.set("client_id", googleClientId);
  googleAuth.searchParams.set("response_type", "code");
  // Use the host the user actually reached us on (z-g.co.il vs
  // www.z-g.co.il), so Google redirects back to the same host and Claude
  // can complete the OAuth flow without a cross-host hop. Both hosts MUST
  // be registered as Authorized redirect URIs in Google Console.
  googleAuth.searchParams.set(
    "redirect_uri",
    `${originFromRequest(req)}${MCP_OAUTH_BASE_PATH}/callback`,
  );
  googleAuth.searchParams.set("scope", "openid email profile");
  googleAuth.searchParams.set("state", signedState);
  googleAuth.searchParams.set("access_type", "online");
  googleAuth.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleAuth.toString());
}
