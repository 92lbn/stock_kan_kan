"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/generated/prisma/enums";

const adminLinks = [
  { href: "/", label: "Accueil" },
  { href: "/stock", label: "Stock" },
  { href: "/planning", label: "Planning" },
  { href: "/pointage", label: "Pointage" },
  { href: "/recettes", label: "Recettes" },
  { href: "/reseaux", label: "Réseaux" },
  { href: "/comptabilite", label: "Compta" },
  { href: "/notes", label: "Notes" },
  { href: "/employees", label: "Employés" },
];

const employeeLinks = [
  { href: "/", label: "Accueil" },
  { href: "/planning", label: "Mon planning" },
  { href: "/pointage", label: "Pointage" },
  { href: "/recettes", label: "Recettes" },
  { href: "/notes", label: "Notes" },
];

// Feedback immédiat de navigation : un fin liseré apparaît sous le lien pressé
// tant que la route cible n'est pas prête (useLinkStatus de Next 16).
function PendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="absolute inset-x-1 -bottom-px h-0.5 animate-pulse rounded-full bg-accent"
    />
  );
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      // Précharge la route au premier contact tactile, avant même le clic.
      onTouchStart={() => router.prefetch(href)}
      className={cn("relative", className)}
    >
      {label}
      <PendingBar />
    </Link>
  );
}

export function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = role === "ADMIN" ? adminLinks : employeeLinks;

  const linkBase =
    "rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-card hover:text-ink";
  const linkActive =
    "bg-ink text-surface";

  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          className="rounded-md p-1.5 text-muted hover:bg-card sm:hidden dark:text-muted"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={pathname === link.href}
              className={cn(linkBase, pathname === link.href && linkActive)}
            />
          ))}
        </nav>

        <span className="text-sm text-muted sm:hidden dark:text-muted">{name}</span>

        <div className="hidden items-center gap-3 sm:flex">
          <ThemeToggle />
          <span className="text-sm text-muted">{name}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-card"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 sm:hidden">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={pathname === link.href}
              onNavigate={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-card hover:text-ink",
                pathname === link.href && linkActive
              )}
            />
          ))}
          <div className="mt-2 border-t border-line px-3 pt-3">
            <ThemeToggle />
          </div>
          <form action={logout} className="mt-1 border-t border-line pt-2">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted hover:bg-card"
            >
              Déconnexion
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
