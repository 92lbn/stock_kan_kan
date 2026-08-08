"use client";

import { useEffect, useState } from "react";

// Bandeau discret quand l'appareil est hors ligne : signale que les données
// affichées sont le dernier état connu (servi par le service worker).
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const isOffline = !navigator.onLine;
      setOffline(isOffline);
      if (isOffline && !since) {
        setSince(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      }
      if (!isOffline) setSince(null);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
    // `since` volontairement hors dépendances : on veut fixer l'heure au 1er passage hors ligne.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="bg-warning px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      Hors ligne — données du {since ?? "dernier chargement"} (lecture seule)
    </div>
  );
}
