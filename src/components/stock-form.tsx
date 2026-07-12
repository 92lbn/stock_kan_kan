"use client";

import { useActionState } from "react";
import { createStockItem } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const categories = [
  { value: "MATERIEL_INFORMATIQUE", label: "Matériel informatique" },
  { value: "CONSOMMABLES", label: "Consommables" },
  { value: "ALIMENTAIRE", label: "Alimentaire" },
];

export function StockForm() {
  const [state, formAction, pending] = useActionState(createStockItem, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <Label htmlFor="name">Nom de l&apos;article</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="category">Catégorie</Label>
        <Select id="category" name="category" required defaultValue="ALIMENTAIRE">
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="unit">Unité</Label>
        <Input id="unit" name="unit" placeholder="carton, kg..." required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="quantity">Quantité</Label>
        <Input id="quantity" name="quantity" type="number" step="any" min="0" defaultValue="0" required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="minThreshold">Seuil d&apos;alerte</Label>
        <Input id="minThreshold" name="minThreshold" type="number" step="any" min="0" defaultValue="0" required />
      </div>

      {state?.error && (
        <p className="sm:col-span-6 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="sm:col-span-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout..." : "Ajouter l'article"}
        </Button>
      </div>
    </form>
  );
}
