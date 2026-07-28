"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-4xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="text-xl font-semibold text-ink">
        Une erreur est survenue
      </h1>
      <p className="max-w-sm text-sm text-muted">
        La page n&apos;a pas pu s&apos;afficher. Réessaie ; si le problème persiste, préviens le
        responsable.
      </p>
      <Button type="button" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
