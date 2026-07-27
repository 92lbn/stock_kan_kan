"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import type { Role } from "@/generated/prisma/enums";
import {
  HomeIcon,
  BoxIcon,
  CalendarIcon,
  NoteIcon,
  ShareIcon,
  EuroIcon,
  UsersIcon,
  MenuIcon,
  LogoutIcon,
} from "@/components/icons";

type NavLink = { href: string; label: string; Icon: (p: { className?: string }) => React.ReactElement };

const HOME: NavLink = { href: "/", label: "Accueil", Icon: HomeIcon };
const STOCK: NavLink = { href: "/stock", label: "Stock", Icon: BoxIcon };
const PLANNING: NavLink = { href: "/planning", label: "Planning", Icon: CalendarIcon };
const NOTES: NavLink = { href: "/notes", label: "Notes", Icon: NoteIcon };
const RESEAUX: NavLink = { href: "/reseaux", label: "Réseaux", Icon: ShareIcon };
const COMPTA: NavLink = { href: "/comptabilite", label: "Compta", Icon: EuroIcon };
const EMPLOYES: NavLink = { href: "/employees", label: "Employés", Icon: UsersIcon };

function linksFor(role: Role) {
  if (role === "ADMIN") {
    return {
      all: [HOME, STOCK, PLANNING, RESEAUX, COMPTA, NOTES, EMPLOYES],
      primary: [HOME, STOCK, PLANNING, NOTES], // barre du bas
      secondary: [RESEAUX, COMPTA, EMPLOYES], // menu "Plus"
    };
  }
  return {
    all: [HOME, PLANNING, NOTES],
    primary: [HOME, PLANNING, NOTES],
    secondary: [] as NavLink[],
  };
}

export function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const { all, primary, secondary } = linksFor(role);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* --- Barre du haut (desktop) --- */}
      <header className="hidden border-b border-zinc-200 bg-white sm:block dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1">
            {all.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                  isActive(link.href) &&
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

      {/* --- En-tête simple (mobile) --- */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Gestion Restaurant</span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{name}</span>
      </header>

      {/* --- Barre de navigation du bas (mobile) --- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
        {primary.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
              )}
            >
              <link.Icon className="h-6 w-6" />
              {link.label}
            </Link>
          );
        })}
        {secondary.length > 0 && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-zinc-400 dark:text-zinc-500"
          >
            <MenuIcon className="h-6 w-6" />
            Plus
          </button>
        )}
      </nav>

      {/* --- Panneau "Plus" (mobile) --- */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-8 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="grid grid-cols-3 gap-3">
              {secondary.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 py-4 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
                    isActive(link.href) && "border-zinc-900 dark:border-white"
                  )}
                >
                  <link.Icon className="h-6 w-6" />
                  {link.label}
                </Link>
              ))}
            </div>
            <form action={logout} className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <LogoutIcon className="h-5 w-5" />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
