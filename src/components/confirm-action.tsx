"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "ghost" | "danger";

// Confirmation accessible avant toute action destructive. S'appuie sur l'élément
// natif <dialog> (showModal) qui fournit le focus trap et la fermeture par Échap.
// `action` est une server action déjà liée (ex. deleteStockItem.bind(null, id)).
export function ConfirmAction({
  action,
  title = "Confirmer la suppression",
  message = "Cette action est réversible mais l'élément sera masqué.",
  confirmLabel = "Supprimer",
  triggerLabel = "Supprimer",
  triggerVariant = "ghost",
  triggerClassName,
}: {
  action: () => void | Promise<unknown>;
  title?: string;
  message?: string;
  confirmLabel?: string;
  triggerLabel?: string;
  triggerVariant?: Variant;
  triggerClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    ref.current?.close();
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        className={triggerClassName}
        aria-label={triggerLabel === "✕" ? confirmLabel : undefined}
        onClick={() => ref.current?.showModal()}
      >
        {triggerLabel}
      </Button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-line bg-card p-0 text-ink shadow-lg backdrop:bg-black/50"
        onClick={(e) => {
          // Clic sur le fond (backdrop) : ferme la modale.
          if (e.target === ref.current) close();
        }}
      >
        <div className="p-5">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted">{message}</p>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close} className="h-11">
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              className="h-11"
              onClick={() =>
                startTransition(async () => {
                  // Ne fermer qu'en cas de succès ; afficher un refus serveur typé.
                  const res = (await action()) as { error?: string } | void;
                  if (res && typeof res === "object" && res.error) {
                    setError(res.error);
                  } else {
                    close();
                  }
                })
              }
            >
              {pending ? "…" : confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
