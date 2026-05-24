import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { AppRole } from "@/types/next-auth";

/**
 * Two Google OAuth providers, intentionally split so that the admin's
 * sensitive `webmasters.readonly` scope doesn't block public sign-ins:
 *
 *   "google"         — admin client. Has webmasters.readonly for /admin/seo.
 *                      Stays in Google Testing mode; only ADMIN_EMAILS allowed.
 *
 *   "google-public"  — public client. Basic scopes only (openid/email/profile),
 *                      so it can publish in Production without Google
 *                      verification. Used by guest sign-ins (e.g. /whatsapp
 *                      workspace members). Registered only if the PUBLIC env
 *                      vars are set.
 */

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

// A non-admin Google account is allowed to sign in only if their email is
// present in at least one access list — WhatsappWorkspaceAccess OR
// TimelineProjectAccess. Anyone else is rejected at the signIn callback
// and never gets a session.
//
// Both allow-lists are checked because the two features share the SSO
// flow: a guest invited to a timeline project but never to a whatsapp
// workspace would otherwise be silently rejected at sign-in and bounce
// back to /admin/login with no clear reason.
async function isAllowedGuestEmail(email: string): Promise<boolean> {
  const lower = email.toLowerCase();
  try {
    const [wsCount, tlCount] = await Promise.all([
      prisma.whatsappWorkspaceAccess.count({ where: { email: lower } }),
      prisma.timelineProjectAccess.count({ where: { email: lower } }),
    ]);
    return wsCount + tlCount > 0;
  } catch (err) {
    // Fail closed — if we can't talk to Postgres we shouldn't let a
    // would-be guest in just because the allowlist check threw.
    console.error("isAllowedGuestEmail check failed:", err);
    return false;
  }
}

function resolveRole(email: string): AppRole {
  return isAdminEmail(email) ? "ADMIN" : "GUEST";
}

const publicClientId = process.env.GOOGLE_CLIENT_ID_PUBLIC;
const publicClientSecret = process.env.GOOGLE_CLIENT_SECRET_PUBLIC;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    // ── Admin provider (with Search Console access) ──
    Google({
      id: "google",
      name: "Google (Admin)",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/webmasters.readonly",
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
      // Both Google providers point at the SAME identity (Google email).
      // Without this flag, signing in via the *other* client when a User
      // row already exists triggers OAuthAccountNotLinked — the exact
      // failure mode admins hit when they go /admin → google, then later
      // /whatsapp/<slug> → google-public. Safe here because we never accept
      // a non-Google provider for the same identity and Google verifies
      // the email before issuing the token.
      allowDangerousEmailAccountLinking: true,
    }),
    // ── Public provider (basic scopes only) ──
    // Only registered when env vars are present, so existing dev/preview
    // environments don't break before the second OAuth client is created.
    ...(publicClientId && publicClientSecret
      ? [
          Google({
            id: "google-public",
            name: "Google",
            clientId: publicClientId,
            clientSecret: publicClientSecret,
            // Default Google scopes only: openid email profile. No
            // `authorization` override → no sensitive scopes requested,
            // so this client can be published to Production.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      // Admin client: webmasters.readonly is a sensitive scope, so the
      // OAuth client is locked to Google Testing-mode test users. Reject
      // anyone who isn't in ADMIN_EMAILS — they shouldn't be hitting this
      // path. Guests should be routed to "google-public" instead.
      if (account?.provider === "google") {
        if (!isAdminEmail(email)) return false;

        // PrismaAdapter only writes tokens to the Account row on FIRST link.
        // On subsequent sign-ins (even with new scopes), the row is reused
        // and not refreshed. Patch the row ourselves with the freshest
        // tokens/scope returned by the OAuth provider so /admin/seo can
        // use them.
        if (user.id) {
          const existing = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
            select: { id: true },
          });
          if (existing) {
            await prisma.account.update({
              where: { id: existing.id },
              data: {
                access_token: account.access_token ?? undefined,
                refresh_token: account.refresh_token ?? undefined,
                expires_at:
                  typeof account.expires_at === "number"
                    ? account.expires_at
                    : undefined,
                scope: account.scope ?? undefined,
                token_type: account.token_type ?? undefined,
                id_token: account.id_token ?? undefined,
              },
            });
          }
        }
        return true;
      }

      // Public client: admin OR allowlisted guest. Same gate as before,
      // but routed through the no-sensitive-scopes client so the OAuth
      // flow itself is open to anyone Google will authenticate.
      if (account?.provider === "google-public") {
        if (!isAdminEmail(email) && !(await isAllowedGuestEmail(email))) {
          return false;
        }
        return true;
      }

      // Unknown provider → reject.
      return false;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Resolve role on every session read so removing an email from
        // ADMIN_EMAILS or from the WhatsApp allowlist takes effect on the
        // next page load without forcing a sign-out flow. NextAuth still
        // gates signIn separately, so this is just keeping the role on a
        // live session truthful.
        session.user.role = resolveRole(session.user.email ?? "");
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
