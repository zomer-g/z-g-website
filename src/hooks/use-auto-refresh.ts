"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Polling that the reader can switch off.
 *
 * WCAG 2.2.4 (Interruptions) and 3.2.5 (Change on Request) both want
 * non-emergency updates to be postponable. Content swapping itself out
 * mid-sentence is disorienting for anyone, and for a screen-reader user it
 * can restart the reading position entirely.
 *
 * The preference is stored per key so it survives navigation, and defaults
 * to on — these pages exist to show a live status.
 */

// localStorage is an external store, so it is read through
// useSyncExternalStore rather than copied into state inside an effect:
// that keeps the server snapshot (always "on") separate from the client's
// and avoids a hydration mismatch on the first paint.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changing the preference should move this one too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readEnabled(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    // Private mode or storage disabled — fall back to the default.
    return true;
  }
}

export function useAutoRefresh(
  load: () => void | Promise<void>,
  intervalMs: number,
  storageKey: string,
) {
  const enabled = useSyncExternalStore(
    subscribe,
    () => readEnabled(storageKey),
    () => true,
  );

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        readEnabled(storageKey) ? "off" : "on",
      );
    } catch {
      /* ignore — nothing to persist, but still notify below */
    }
    listeners.forEach((l) => l());
  }, [storageKey]);

  // Always load once; only repeat while enabled.
  useEffect(() => {
    void load();
    if (!enabled) return;
    const t = setInterval(() => void load(), intervalMs);
    return () => clearInterval(t);
  }, [load, enabled, intervalMs]);

  const refreshNow = useCallback(() => void load(), [load]);

  return { enabled, toggle, refreshNow };
}
