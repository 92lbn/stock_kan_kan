"use client";

import { useState } from "react";
import { deleteLedgerEntry } from "@/lib/actions/ledger";
import { LedgerForm } from "@/components/ledger-form";
import { Sheet } from "@stock-kan-kan/ui/sheet";
import { ConfirmAction } from "@stock-kan-kan/ui/confirm-action";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type LedgerEntryVM = {
  id: string;
  dateLabel: string;
  type: "REVENUE" | "EXPENSE";
  category: string;
  amount: number;
};

export function LedgerEntries({ entries }: { entries: LedgerEntryVM[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-ink">Entrées du mois</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-md border border-line-strong bg-card px-3 py-1.5 text-sm font-medium text-ink hover:bg-card-2"
        >
          + Ajouter
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-8 text-center text-sm text-muted shadow-sm">
          Aucune entrée ce mois-ci.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-8 w-1 flex-none rounded-full"
                style={{ backgroundColor: e.type === "REVENUE" ? "var(--positive)" : "var(--danger)" }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{e.category || (e.type === "REVENUE" ? "Recette" : "Dépense")}</span>
                <span className="text-xs text-muted">{e.dateLabel}</span>
              </span>
              <span
                className={`num text-sm font-semibold ${e.type === "REVENUE" ? "text-positive" : "text-danger"}`}
              >
                {e.type === "REVENUE" ? "+" : "−"}
                {eur.format(e.amount)}
              </span>
              <ConfirmAction
                action={deleteLedgerEntry.bind(null, e.id)}
                message="L'entrée sera masquée (suppression réversible)."
                triggerLabel="✕"
              />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Nouvelle entrée"
        className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl text-accent-ink shadow-lg transition-transform active:scale-95 sm:bottom-8"
      >
        +
      </button>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Nouvelle entrée">
        <div className="pb-2">
          <LedgerForm onDone={() => setAddOpen(false)} />
        </div>
      </Sheet>
    </div>
  );
}
