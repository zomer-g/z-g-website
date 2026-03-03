import { cn } from "@/lib/utils";

/* ─── Types ─── */

export interface SectionHeadingProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Main heading text (rendered as h2). */
  title: string;
  /** Optional subtitle displayed below the heading. */
  subtitle?: string;
  /** Horizontal alignment of the heading block. */
  align?: "start" | "center";
}

/* ─── Component ─── */

export function SectionHeading({
  title,
  subtitle,
  align = "center",
  className,
  ...props
}: SectionHeadingProps) {
  const isCenter = align === "center";

  return (
    <div
      className={cn(
        "mb-12",
        isCenter && "text-center",
        className,
      )}
      {...props}
    >
      {/* Decorative accent line */}
      <div
        className={cn(
          "mb-4 h-1 w-16 rounded-full bg-accent",
          isCenter && "mx-auto",
        )}
        aria-hidden="true"
      />

      <h2
        className={cn(
          "text-3xl font-bold leading-snug tracking-tight text-primary-dark",
          "sm:text-4xl",
        )}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={cn(
            "mt-3 text-lg leading-relaxed text-muted",
            isCenter && "mx-auto max-w-2xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
