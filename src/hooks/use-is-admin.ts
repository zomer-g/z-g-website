"use client";

import { useSession } from "next-auth/react";

export function useIsAdmin() {
  const { data: session, status } = useSession();
  return {
    isAdmin: status === "authenticated" && !!session?.user,
    isLoading: status === "loading",
  };
}
