"use client";

import { useEffect, useState } from "react";
import { Button } from "@stock-kan-kan/ui/button";

// Après une nuit ou un déploiement, la première requête peut tomber pendant que
// l'application et sa base se "réveillent" (voir docs/dashboard-integration.md pour le
// contexte). On retente donc discrètement plusieurs fois avant d'afficher une vraie
// erreur, pour ne pas faire croire à l'équipe que le site est cassé.
const RETRY_KEY = "stock-error-retry";
const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
const RETRY_WINDOW_MS = 15_000; // au-delà, on considère qu'il s'agit d'une nouvelle panne.

// Compte la tentative dans sessionStorage et dit si on a dépassé le quota d'essais
// silencieux. Appelé une seule fois par montage (initialiseur paresseux de useState),
// jamais depuis un effet, pour rester compatible avec les règles de pureté React 19.
function registerAttemptAndShouldHardFail(): boolean {
  let previous: { count: number; at: number } | null = null;
  try {
    const stored = sessionStorage.getItem(RETRY_KEY);
    previous = stored ? JSON.parse(stored) : null;
  } catch {
    previous = null;
  }

  const now = Date.now();
  const sameEpisode = previous && now - previous.at < RETRY_WINDOW_MS;
  const count = sameEpisode ? previous!.count + 1 : 1;

  try {
    sessionStorage.setItem(RETRY_KEY, JSON.stringify({ count, at: now }));
  } catch {
    // Stockage indisponible (navigation privée) : on retente quand même une fois.
  }

  return count > MAX_AUTO_RETRIES;
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showHardError] = useState(registerAttemptAndShouldHardFail);

  useEffect(() => {
    console.error(error);
    if (showHardError) return;
    const timer = setTimeout(() => reset(), RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [error, reset, showHardError]);

  if (!showHardError) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center"
      >
        <p className="text-4xl" aria-hidden="true">
          ⏳
        </p>
        <h1 className="text-lg font-semibold text-ink">Ça se prépare…</h1>
        <p className="max-w-sm text-sm text-muted">
          L’application vient de se réveiller, ça ne prend que quelques secondes. Merci de
          patienter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-4xl" aria-hidden="true">
        ⚠️
      </p>
      <h1 className="text-xl font-semibold text-ink">Une erreur est survenue</h1>
      <p className="max-w-sm text-sm text-muted">
        La page n&apos;a pas pu s&apos;afficher. Réessaie ; si le problème persiste, préviens le
        responsable.
      </p>
      <Button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem(RETRY_KEY);
          } catch {
            // Ignoré : le bouton relance de toute façon le rendu.
          }
          reset();
        }}
      >
        Réessayer
      </Button>
    </div>
  );
}
