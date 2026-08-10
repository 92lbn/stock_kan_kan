import { cn } from "@stock-kan-kan/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-card p-5 shadow-sm", className)}
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
    default: "border border-line bg-card-2 text-muted",
    warning: "bg-[var(--warning-bg)] text-warning",
    danger: "bg-danger/12 text-danger",
    success: "bg-positive/12 text-positive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
