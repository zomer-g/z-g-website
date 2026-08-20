"use client";

import { useEffect, useRef } from "react";

/**
 * Everything a modal owes a keyboard user, in one hook:
 *
 *   - moves focus into the dialog when it opens,
 *   - keeps Tab / Shift+Tab cycling inside it (WCAG 2.4.3),
 *   - closes on Escape (WCAG 2.1.2 — no keyboard trap),
 *   - returns focus to whatever was focused before it opened.
 *
 * Spread the returned `dialogProps` onto the dialog container and give it
 * an accessible name via `aria-label` / `aria-labelledby`:
 *
 *   const { dialogProps } = useModalDialog(open, close);
 *   <div {...dialogProps} aria-label="תמונה מוגדלת">…</div>
 *
 * The header's mobile menu is the reference implementation this was lifted
 * from; it keeps its own copy because it also drives submenu state.
 */
export function useModalDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  // Remember the trigger before focus moves, and hand focus back on close.
  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      restoreTo.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        // Nothing to move to — keep focus on the dialog itself rather than
        // letting Tab escape to the page behind.
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Stop the page behind from scrolling under the overlay.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return {
    dialogProps: {
      ref,
      role: "dialog" as const,
      "aria-modal": true,
      tabIndex: -1,
    },
  };
}
