"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@stock-kan-kan/auth/actions";
import { cn } from "@stock-kan-kan/lib/utils";
import { Icon } from "@stock-kan-kan/ui/icons";
import { ThemeToggle } from "@stock-kan-kan/ui/theme-toggle";

const common = [
  { href: "/", label: "Accueil", icon: "home" as const },
  { href: "/planning", label: "Planning", icon: "calendar" as const },
  { href: "/pointage", label: "Historique", icon: "clock" as const },
];

export function Nav({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...common, { href: "/employees", label: "Équipe", icon: "users" as const }] : common;
  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-line bg-card/95 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-2.5 lg:px-6">
          <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-ink" aria-hidden="true">k·k</span>
            <span>kan·kan <span className="font-normal text-muted">planning</span></span>
          </Link>
          <nav className="flex flex-1 gap-1">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
                className={cn("flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium", active ? "bg-accent/10 text-accent" : "text-muted hover:bg-card-2 hover:text-ink")}>
                <Icon name={link.icon} width={18} height={18} />{link.label}
              </Link>;
            })}
          </nav>
          <span className="max-w-32 truncate text-sm font-medium text-ink">{name}</span><ThemeToggle />
          <form action={logout}><button className="min-h-11 rounded-xl px-3 text-sm text-muted hover:bg-card-2 hover:text-ink" type="submit">Déconnexion</button></form>
        </div>
      </header>
      <nav aria-label="Navigation principale" className={cn("fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden", isAdmin ? "grid-cols-4" : "grid-cols-3")}>
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
            className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium", active ? "text-accent" : "text-muted")}>
            {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
            <Icon name={link.icon} width={22} height={22} />{link.label}
          </Link>;
        })}
      </nav>
    </>
  );
}
