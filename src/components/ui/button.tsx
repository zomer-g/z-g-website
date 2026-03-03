"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/* ─── Variant & Size Maps ─── */

const variantStyles = {
  primary:
    "bg-primary text-white hover:bg-primary-light active:bg-primary-dark",
  secondary:
    "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white active:bg-primary-dark active:text-white",
  accent:
    "bg-accent text-primary-dark hover:bg-accent-light active:bg-accent",
  ghost:
    "bg-transparent text-foreground hover:bg-muted-bg active:bg-border",
} as const;

const sizeStyles = {
  sm: "px-4 py-1.5 text-sm gap-1.5",
  md: "px-6 py-2.5 text-base gap-2",
  lg: "px-8 py-3.5 text-lg gap-2.5",
} as const;

/* ─── Types ─── */

type ButtonVariant = keyof typeof variantStyles;
type ButtonSize = keyof typeof sizeStyles;

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/* ─── Component ─── */

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(props, ref) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    className,
    children,
    ...rest
  } = props;

  const classes = cn(
    // Base
    "inline-flex items-center justify-center font-semibold rounded-lg",
    "transition-colors duration-200",
    // Focus - WCAG AAA visible indicator
    "focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
    // Disabled
    "disabled:opacity-50 disabled:pointer-events-none",
    "aria-disabled:opacity-50 aria-disabled:pointer-events-none",
    // Variant & size
    variantStyles[variant],
    sizeStyles[size],
    // Full width
    fullWidth && "w-full",
    className,
  );

  /* ── Render as link ── */
  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorProps } = rest as Omit<
      React.AnchorHTMLAttributes<HTMLAnchorElement>,
      keyof ButtonBaseProps
    > & { href: string };

    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  /* ── Render as button ── */
  const { type = "button", disabled, ...buttonProps } = rest as Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    keyof ButtonBaseProps
  >;

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled || loading}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      className={classes}
      {...buttonProps}
    >
      {loading && (
        <Loader2
          className="animate-spin shrink-0"
          size={size === "sm" ? 14 : size === "lg" ? 22 : 18}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

Button.displayName = "Button";
