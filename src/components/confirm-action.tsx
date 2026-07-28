"use client";

import { useRef, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  const close = () => ref.current?.close();

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        className={triggerClassName}
        onClick={() => ref.current?.showModal()}
      >
        {triggerLabel}
      </Button>

      <dialog
        ref={ref}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-lg backdrop:bg-black/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        onClick={(e) => {
          // Clic sur le fond (backdrop) : ferme la modale.
          if (e.target === ref.current) close();
        }}
      >
        <div className="p-5">
          <h2 id="confirm-title" className="text-base font-semibold">
            {title}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
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
                  await action();
                  close();
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
