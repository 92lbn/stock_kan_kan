import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-surface hover:opacity-90 border border-ink",
  secondary: "bg-card text-ink border border-line hover:border-ink",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-card",
  danger: "bg-accent text-accent-ink border border-accent hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  // Cibles tactiles : md respecte 44px (usage debout, une main). sm réservé au non-destructif.
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "secondary",
  size = "md",
  href,
  children,
}: {
  className?: string;
  variant?: Variant;
  size?: Size;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </Link>
  );
}
