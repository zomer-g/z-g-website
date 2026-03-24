"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface AdminBarContextValue {
  isAdmin: boolean;
  isLoading: boolean;
  editMode: boolean;
  toggleEditMode: () => void;
}

const AdminBarContext = createContext<AdminBarContextValue>({
  isAdmin: false,
  isLoading: true,
  editMode: false,
  toggleEditMode: () => {},
});

const STORAGE_KEY = "admin-edit-mode";

export function AdminEditModeProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useIsAdmin();
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    setEditMode(stored === null ? true : stored === "true");
  }, []);

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <AdminBarContext.Provider
      value={{
        isAdmin: mounted && isAdmin,
        isLoading: !mounted || isLoading,
        editMode: mounted && isAdmin && editMode,
        toggleEditMode,
      }}
    >
      {children}
    </AdminBarContext.Provider>
  );
}

export function useEditMode() {
  return useContext(AdminBarContext);
}
