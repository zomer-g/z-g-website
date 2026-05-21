// Module augmentation for NextAuth v5.
//
// We add `role` to the session user so route guards can do
//   if (session?.user?.role !== "ADMIN") notFound();
// instead of relying on the looser `!!session.user` check (which would
// also pass for GUEST-tier users that only have WhatsApp workspace access).
//
// Keep this file in sync with src/lib/auth.ts — the `session` callback is
// what actually populates the field at runtime; the augmentation is just
// what makes the TypeScript compiler aware.

import type { DefaultSession } from "next-auth";

export type AppRole = "ADMIN" | "GUEST";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}
