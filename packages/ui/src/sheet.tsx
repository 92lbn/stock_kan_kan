"use client";

import { useEffect, useRef } from "react";

// Feuille d'action ancrée en bas d'écran (bottom sheet), pattern des apps mobiles.
// S'appuie sur <dialog> natif : focus trap + fermeture par Échap gratuits.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-label={title}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto w-full max-w-lg bg-transparent p-0 backdrop:bg-black/50"
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div
          className="max-h-[86vh] overflow-y-auto rounded-t-2xl border-t border-line bg-card px-4 pt-3 text-ink shadow-lg"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <div className="sticky top-0 -mx-4 mb-2 bg-card px-4 pb-2 pt-1">
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
            {title && (
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer"
                  className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-card-2"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
