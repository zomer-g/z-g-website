import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { AppRole } from "@/types/next-auth";

const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());

function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

// A non-admin Google account is allowed to sign in only if their email is
// present in at least one WhatsappWorkspaceAccess row. Anyone else is
// rejected at the signIn callback and never gets a session.
async function isAllowedGuestEmail(email: string): Promise<boolean> {
  try {
    const count = await prisma.whatsappWorkspaceAccess.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
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
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();
      // Admin emails (env-configured) bypass the DB lookup. Everyone else
      // must be on at least one WhatsappWorkspaceAccess row.
      if (!isAdminEmail(email) && !(await isAllowedGuestEmail(email))) {
        return false;
      }

      // PrismaAdapter only writes tokens to the Account row on FIRST link.
      // On subsequent sign-ins (even with new scopes), the row is reused and
      // not refreshed. Patch the row ourselves with the freshest tokens/scope
      // returned by the OAuth provider so /admin/seo can use them.
      if (account?.provider === "google" && user.id) {
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
