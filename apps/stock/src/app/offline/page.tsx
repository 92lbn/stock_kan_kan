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
      <h1 className="text-xl font-semibold text-ink">
        Hors ligne
      </h1>
      <p className="max-w-xs text-sm text-muted">
        Cette application nécessite une connexion pour protéger les données du restaurant.
        Reconnecte-toi pour consulter le dernier état du stock et tes notes.
      </p>
    </div>
  );
}
