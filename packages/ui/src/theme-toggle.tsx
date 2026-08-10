"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@stock-kan-kan/lib/utils";

type Theme = "light" | "dark" | "system";

const options: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Clair", icon: "☀" },
  { value: "system", label: "Système", icon: "◐" },
  { value: "dark", label: "Sombre", icon: "☾" },
];

// Petit store externe : lecture SSR-safe via useSyncExternalStore (pas de setState
// synchrone dans un effet), écriture qui applique le thème + notifie les abonnés.
let listeners: (() => void)[] = [];
function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
function getSnapshot(): Theme {
  try {
    const t = localStorage.getItem("theme");
    // Défaut = clair (et non « système ») si aucun choix n'a été fait.
    return t === "light" || t === "dark" || t === "system" ? t : "light";
  } catch {
    return "light";
  }
}

function setThemePref(theme: Theme) {
  const root = document.documentElement;
  try {
    if (theme === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      root.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  } catch {}
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as Theme);

  return (
    <div
      role="group"
      aria-label="Thème"
      className="inline-flex items-center gap-0.5 border border-line p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setThemePref(o.value)}
          className={cn(
            "flex h-8 w-8 items-center justify-center text-sm",
            theme === o.value ? "bg-accent text-accent-ink" : "text-muted hover:bg-card"
          )}
        >
          <span aria-hidden>{o.icon}</span>
        </button>
      ))}
    </div>
  );
}
