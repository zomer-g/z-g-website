"use client";

import { useSession } from "next-auth/react";

export function useIsAdmin() {
  const { data: session, status } = useSession();
  return {
    // Only true ADMIN role grants admin UI features. GUEST users (WhatsApp
    // workspace allowlist) are "authenticated" but must not see admin chrome.
    isAdmin: status === "authenticated" && session?.user?.role === "ADMIN",
    isLoading: status === "loading",
  };
}
