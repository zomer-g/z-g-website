import { cn } from "@/lib/utils";

/* ─── Card ─── */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground",
        "shadow-sm shadow-primary/5",
        "transition-shadow duration-200",
        className,
      )}
      {...props}
    />
  );
}

/* ─── CardHeader ─── */

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-6 pb-0", className)}
      {...props}
    />
  );
}

/* ─── CardTitle ─── */

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xl font-bold leading-snug tracking-tight text-primary-dark",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

/* ─── CardDescription ─── */

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-muted", className)}
      {...props}
    />
  );
}

/* ─── CardContent ─── */

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

/* ─── CardFooter ─── */

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-6 pt-0",
        className,
      )}
      {...props}
    />
  );
}
