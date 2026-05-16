import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());

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
      if (!adminEmails.includes(user.email.toLowerCase())) return false;

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
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
