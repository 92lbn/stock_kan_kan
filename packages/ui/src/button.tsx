import { cn } from "@stock-kan-kan/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong shadow-sm",
  secondary: "bg-card text-ink border border-line-strong hover:bg-card-2",
  ghost: "bg-transparent text-muted hover:bg-card-2 hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
};

const sizeClasses: Record<Size, string> = {
  // Cibles tactiles : md respecte 44px (usage debout, une main). sm au non-destructif.
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

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
