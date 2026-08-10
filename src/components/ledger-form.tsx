"use client";

import { useActionState, useEffect, useRef } from "react";
import { createLedgerEntry } from "@/lib/actions/ledger";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";

export function LedgerForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(createLedgerEntry, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone?.();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-1">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={today} required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" defaultValue="REVENUE">
          <option value="REVENUE">Recette</option>
          <option value="EXPENSE">Dépense</option>
        </Select>
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="amount">Montant (€)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="category">Catégorie</Label>
        <Input id="category" name="category" placeholder="Ventes, loyer, achat stock..." />
      </div>
      <div className="flex items-end sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "..." : "Ajouter"}
        </Button>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="note">Note (optionnel)</Label>
        <Input id="note" name="note" />
      </div>

      {state?.error && (
        <p className="sm:col-span-2 text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
