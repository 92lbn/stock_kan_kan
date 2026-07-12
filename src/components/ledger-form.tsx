"use client";

import { useActionState } from "react";
import { createLedgerEntry } from "@/lib/actions/ledger";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function LedgerForm() {
  const [state, formAction, pending] = useActionState(createLedgerEntry, undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-6">
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
      <div className="sm:col-span-1 flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "..." : "Ajouter"}
        </Button>
      </div>
      <div className="sm:col-span-6">
        <Label htmlFor="note">Note (optionnel)</Label>
        <Input id="note" name="note" />
      </div>

      {state?.error && (
        <p className="sm:col-span-6 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
