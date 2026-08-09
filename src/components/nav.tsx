"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/icons";
import type { Role } from "@/generated/prisma/enums";

type Item = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] };

const adminLinks: Item[] = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/stock", label: "Stock", icon: "box" },
  { href: "/planning", label: "Planning", icon: "calendar" },
  { href: "/comptabilite", label: "Compta", icon: "euro" },
  { href: "/recettes", label: "Recettes", icon: "book" },
  { href: "/reseaux", label: "Réseaux", icon: "share" },
  { href: "/notes", label: "Notes", icon: "note" },
  { href: "/employees", label: "Employés", icon: "users" },
  { href: "/pointage", label: "Pointage", icon: "clock" },
];

const employeeLinks: Item[] = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/planning", label: "Mon planning", icon: "calendar" },
  { href: "/recettes", label: "Recettes", icon: "book" },
  { href: "/notes", label: "Notes", icon: "note" },
  { href: "/pointage", label: "Pointage", icon: "clock" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

// Fin liseré sous le lien pressé tant que la route cible n'est pas prête.
function PendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />;
}

export function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const links = role === "ADMIN" ? adminLinks : employeeLinks;
  const primary = links.slice(0, 4);
  const rest = links.slice(4);

  return (
    <>
      {/* ── Barre supérieure (bureau) ── */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-card/95 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-4 py-2.5 lg:px-8">
          <span className="mr-2 flex items-center gap-2 font-semibold tracking-tight text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-ink text-sm">
              K
            </span>
            kan·kan
          </span>
          <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onTouchStart={() => router.prefetch(link.href)}
                  className={cn(
                    "relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent/12 text-accent"
                      : "text-muted hover:bg-card-2 hover:text-ink"
                  )}
                >
                  <Icon name={link.icon} width={16} height={16} />
                  {link.label}
                  <PendingBar />
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 pl-2">
            <ThemeToggle />
            <span className="max-w-28 truncate text-sm text-muted">{name}</span>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Déconnexion"
                className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-card-2 hover:text-ink"
              >
                <Icon name="logout" width={18} height={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Barre d'onglets basse (mobile) ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {primary.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onTouchStart={() => router.prefetch(link.href)}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-medium",
                  active ? "text-accent" : "text-muted"
                )}
              >
                {active && (
                  <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />
                )}
                <Icon name={link.icon} width={22} height={22} />
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Plus"
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-medium text-muted"
          >
            <Icon name="plus" width={22} height={22} />
            Plus
          </button>
        </div>
      </nav>

      {/* ── Feuille « Plus » (mobile) ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-card p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{name}</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fermer"
                className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-card-2"
              >
                <Icon name="x" width={20} height={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {rest.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border text-xs font-medium",
                      active
                        ? "border-accent bg-accent/12 text-accent"
                        : "border-line bg-card-2 text-muted"
                    )}
                  >
                    <Icon name={link.icon} width={22} height={22} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <ThemeToggle />
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-card-2"
                >
                  <Icon name="logout" width={18} height={18} />
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
