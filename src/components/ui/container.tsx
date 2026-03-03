import { cn } from "@/lib/utils";

/* ─── Types ─── */

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** HTML element to render. Defaults to "div". */
  as?: "div" | "section" | "article" | "main" | "aside" | "header" | "footer";
  /** Narrower max-width for readable content. */
  narrow?: boolean;
}

/* ─── Component ─── */

export function Container({
  as: Tag = "div",
  narrow = false,
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full",
        "px-4 sm:px-6 lg:px-8",
        narrow ? "max-w-3xl" : "max-w-7xl",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
