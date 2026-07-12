"use client";

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
  { href: "/employees", label: "Employés" },
];

const employeeLinks = [
  { href: "/", label: "Accueil" },
  { href: "/planning", label: "Mon planning" },
  { href: "/pointage", label: "Pointage" },
];

export function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? adminLinks : employeeLinks;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1">
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
        <div className="flex items-center gap-3">
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
    </header>
  );
}
