import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

/**
 * Two Google OAuth providers, intentionally split:
 *
 *  - "google" (admin):  has the `webmasters.readonly` sensitive scope used by
 *                       /admin/seo. Stays in Google Testing mode — only emails
 *                       in ADMIN_EMAILS are accepted at the signIn callback.
 *                       Uses the OAuth client identified by GOOGLE_CLIENT_ID.
 *
 *  - "google-public":   no sensitive scopes. Safe to publish to Production in
 *                       Google Cloud without verification. Anyone can sign in
 *                       through it for public-facing features. Uses the OAuth
 *                       client identified by GOOGLE_CLIENT_ID_PUBLIC.
 *
 * The split keeps the admin's sensitive scope from blocking public sign-ins.
 */

export const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
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
            // Default Google scopes only: openid email profile.
            // No `authorization` override → no sensitive scopes requested.
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Admin provider: gate on ADMIN_EMAILS.
      if (account?.provider === "google") {
        if (!isAdminEmail(user.email)) return false;

        // PrismaAdapter only writes tokens to the Account row on FIRST link.
        // On subsequent sign-ins (even with new scopes), the row is reused and
        // not refreshed. Patch the row ourselves with the freshest tokens/scope
        // returned by the OAuth provider so /admin/seo can use them.
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

      // Public provider: allow anyone with a verified Google email.
      if (account?.provider === "google-public") {
        return true;
      }

      // Unknown provider → reject.
      return false;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
