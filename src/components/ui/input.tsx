"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

/* ─── Shared Styles ─── */

const fieldStyles = cn(
  "w-full rounded-lg border border-border bg-background px-4 py-2.5",
  "text-foreground placeholder:text-muted",
  "transition-colors duration-200",
  "hover:border-primary/40",
  "focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
  "focus-visible:border-primary",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted-bg",
);

const errorFieldStyles = "border-error focus-visible:border-error";

/* ─── Input ─── */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label?: string;
  error?: string;
  helperText?: string;
  id?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, className, id: externalId, ...props },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-foreground"
        >
          {label}
          {props.required && (
            <span className="text-error me-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <input
        ref={ref}
        id={id}
        aria-invalid={hasError || undefined}
        aria-describedby={
          [hasError ? errorId : null, helperText ? helperId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn(fieldStyles, hasError && errorFieldStyles, className)}
        {...props}
      />

      {hasError && (
        <p id={errorId} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {helperText && !hasError && (
        <p id={helperId} className="text-sm text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

/* ─── Textarea ─── */

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label?: string;
  error?: string;
  helperText?: string;
  id?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, error, helperText, className, id: externalId, rows = 4, ...props },
    ref,
  ) {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-semibold text-foreground"
          >
            {label}
            {props.required && (
              <span className="text-error me-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={hasError || undefined}
          aria-describedby={
            [hasError ? errorId : null, helperText ? helperId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            fieldStyles,
            "resize-y min-h-[100px]",
            hasError && errorFieldStyles,
            className,
          )}
          {...props}
        />

        {hasError && (
          <p id={errorId} className="text-sm text-error" role="alert">
            {error}
          </p>
        )}

        {helperText && !hasError && (
          <p id={helperId} className="text-sm text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
