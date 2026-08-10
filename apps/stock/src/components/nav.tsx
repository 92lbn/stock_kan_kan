"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@stock-kan-kan/auth/actions";
import { cn } from "@stock-kan-kan/lib/utils";
import { Icon } from "@stock-kan-kan/ui/icons";
import { ThemeToggle } from "@stock-kan-kan/ui/theme-toggle";

const links = [
  { href: "/", label: "Accueil", icon: "home" as const },
  { href: "/stock", label: "Stock", icon: "box" as const },
  { href: "/notes", label: "Notes", icon: "note" as const },
];

export function Nav({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-line bg-card sm:block">
        <div className="mx-auto flex max-w-[1800px] items-center gap-4 px-4 py-2.5 lg:px-8">
          <span className="font-semibold text-ink">kan·kan stock</span>
          <nav className="flex flex-1 gap-1">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
                className={cn("flex min-h-11 items-center gap-2 px-3 text-sm font-medium", active ? "text-accent" : "text-muted")}>
                <Icon name={link.icon} width={18} height={18} />{link.label}
              </Link>;
            })}
          </nav>
          <span className="text-sm text-muted">{name}</span><ThemeToggle />
          <form action={logout}><button className="min-h-11 px-3 text-sm text-muted" type="submit">Déconnexion</button></form>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-card sm:hidden">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
            className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium", active ? "text-accent" : "text-muted")}>
            <Icon name={link.icon} width={22} height={22} />{link.label}
          </Link>;
        })}
      </nav>
    </>
  );
}
