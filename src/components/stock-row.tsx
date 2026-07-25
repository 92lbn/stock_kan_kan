"use client";

import { useActionState } from "react";
import { recordStockMovement, deleteStockItem } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";

const categoryLabels: Record<string, string> = {
  MATERIEL_INFORMATIQUE: "Matériel informatique",
  CONSOMMABLES: "Consommables",
  ALIMENTAIRE: "Alimentaire",
  HYGIENE: "Hygiène",
  EMBALLAGE: "Emballage",
};

type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minThreshold: number;
};

export function StockRow({ item }: { item: StockItem }) {
  const boundMovement = recordStockMovement.bind(null, item.id);
  const [state, formAction, pending] = useActionState(boundMovement, undefined);
  const isLow = item.quantity <= item.minThreshold;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
          <p className="text-xs text-zinc-500">{categoryLabels[item.category]}</p>
        </div>
        <form action={deleteStockItem.bind(null, item.id)}>
          <Button type="submit" size="sm" variant="ghost">
            Supprimer
          </Button>
        </form>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {item.quantity}
        </span>
        <span className="text-sm text-zinc-500">{item.unit}</span>
        {isLow && (
          <Badge variant="warning" className="ml-auto">
            Seuil : {item.minThreshold}
          </Badge>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <Select name="type" defaultValue="IN" className="h-10 w-28">
          <option value="IN">Entrée</option>
          <option value="OUT">Sortie</option>
        </Select>
        <Input
          name="quantity"
          type="number"
          step="any"
          min="0"
          placeholder="Quantité"
          required
          className="h-10 w-28"
        />
        <Button type="submit" size="md" variant="secondary" disabled={pending}>
          Valider
        </Button>
      </form>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
