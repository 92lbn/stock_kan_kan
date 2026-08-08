"use client";

import { useActionState } from "react";
import { createStockItem } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const categories = [
  { value: "EPICERIE", label: "Épicerie / Secs" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages" },
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
        <Select id="category" name="category" required defaultValue="EPICERIE">
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
      <div className="sm:col-span-2">
        <Label htmlFor="costPrice">Coût unitaire (€)</Label>
        <Input id="costPrice" name="costPrice" type="number" step="0.01" min="0" defaultValue="0" />
      </div>
      <div className="sm:col-span-4">
        <Label htmlFor="allergens">Allergènes (séparés par des virgules)</Label>
        <Input id="allergens" name="allergens" placeholder="gluten, lait, œuf..." />
      </div>

      {state?.error && (
        <p className="sm:col-span-6 text-sm text-danger">{state.error}</p>
      )}

      <div className="sm:col-span-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout..." : "Ajouter l'article"}
        </Button>
      </div>
    </form>
  );
}
