// Page de secours servie par le service worker quand une navigation échoue hors ligne
// et qu'aucune version en cache n'existe. Volontairement hors du groupe (app) : pas
// d'accès base, pas de dépendance réseau.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-4xl" aria-hidden>
        📶
      </p>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Hors ligne
      </h1>
      <p className="max-w-xs text-sm text-zinc-500">
        Cette page n&apos;a pas encore été consultée. Reconnecte-toi pour la charger. Les pages
        déjà visitées (stock, recettes…) restent accessibles.
      </p>
    </div>
  );
}
