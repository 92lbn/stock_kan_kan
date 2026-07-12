"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import type { Role } from "@/generated/prisma/enums";

const adminLinks = [
  { href: "/", label: "Accueil" },
  { href: "/stock", label: "Stock" },
  { href: "/planning", label: "Planning" },
  { href: "/pointage", label: "Pointage" },
  { href: "/comptabilite", label: "Compta" },
  { href: "/employees", label: "Employés" },
];

const employeeLinks = [
  { href: "/", label: "Accueil" },
  { href: "/planning", label: "Mon planning" },
  { href: "/pointage", label: "Pointage" },
];

export function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = role === "ADMIN" ? adminLinks : employeeLinks;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 sm:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                pathname === link.href &&
                  "bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white dark:bg-white dark:text-zinc-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <span className="text-sm text-zinc-500 sm:hidden dark:text-zinc-400">{name}</span>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{name}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-zinc-200 px-4 py-3 sm:hidden dark:border-zinc-800">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                pathname === link.href &&
                  "bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white dark:bg-white dark:text-zinc-900"
              )}
            >
              {link.label}
            </Link>
          ))}
          <form action={logout} className="mt-1 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Déconnexion
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
