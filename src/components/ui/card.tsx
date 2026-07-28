import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-sm border border-line bg-card p-5", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "warning" | "danger" | "success";
}) {
  const variants = {
    default: "border border-line bg-transparent text-muted",
    // Alerte / négatif : accent braise (identité « une seule couleur chaude »).
    warning: "border border-accent text-accent",
    danger: "bg-accent text-accent-ink",
    success: "border border-positive text-positive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
