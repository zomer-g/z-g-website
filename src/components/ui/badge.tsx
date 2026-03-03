import { cn } from "@/lib/utils";

/* ─── Variant Map ─── */

const variantStyles = {
  default: "bg-primary/10 text-primary-dark",
  primary: "bg-primary text-white",
  accent: "bg-accent/15 text-primary-dark",
  success: "bg-success/10 text-success",
  error: "bg-error/10 text-error",
  muted: "bg-muted-bg text-muted",
  outline: "bg-transparent border border-border text-foreground",
} as const;

type BadgeVariant = keyof typeof variantStyles;

/* ─── Types ─── */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/* ─── Component ─── */

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5",
        "text-xs font-semibold leading-5",
        "whitespace-nowrap select-none",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
