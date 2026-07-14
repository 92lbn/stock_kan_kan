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
    <tr className="border-b border-zinc-100 align-top dark:border-zinc-800">
      <td className="py-3 pr-3">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
        <p className="text-xs text-zinc-500">{categoryLabels[item.category]}</p>
      </td>
      <td className="py-3 pr-3">
        <span className="text-zinc-700 dark:text-zinc-300">
          {item.quantity} {item.unit}
        </span>
        {isLow && (
          <Badge variant="warning" className="ml-2">
            Seuil : {item.minThreshold}
          </Badge>
        )}
      </td>
      <td className="py-3 pr-3">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <Select name="type" defaultValue="IN" className="h-8 w-24 text-xs">
            <option value="IN">Entrée</option>
            <option value="OUT">Sortie</option>
          </Select>
          <Input
            name="quantity"
            type="number"
            step="any"
            min="0"
            placeholder="Qté"
            required
            className="h-8 w-20 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            OK
          </Button>
        </form>
        {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      </td>
      <td className="py-3 text-right">
        <form action={deleteStockItem.bind(null, item.id)}>
          <Button type="submit" size="sm" variant="ghost">
            Supprimer
          </Button>
        </form>
      </td>
    </tr>
  );
}
