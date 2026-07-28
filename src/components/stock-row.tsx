"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState } from "react";
import type { ActionState } from "@/lib/actions/stock";
import { recordStockMovement, deleteStockItem, updateStockItem } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";
import { ConfirmAction } from "@/components/confirm-action";

const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

const categories = [
  { value: "EPICERIE", label: "Épicerie / Secs" },
  { value: "LEGUMES_FRAIS", label: "Légumes / Frais" },
  { value: "VIANDES_POISSONS", label: "Viandes / Poissons" },
  { value: "BOISSONS", label: "Boissons" },
  { value: "MENAGER_ENTRETIEN", label: "Ménager / Entretien" },
  { value: "CONSOMMABLES_EMBALLAGES", label: "Consommables / Emballages" },
];

const categoryLabels: Record<string, string> = {
  MATERIEL_INFORMATIQUE: "Matériel informatique",
  CONSOMMABLES: "Consommables",
  ALIMENTAIRE: "Alimentaire",
  HYGIENE: "Hygiène",
  EMBALLAGE: "Emballage",
  MENAGER_ENTRETIEN: "Ménager / Entretien",
  EPICERIE: "Épicerie / Secs",
  LEGUMES_FRAIS: "Légumes / Frais",
  BOISSONS: "Boissons",
  VIANDES_POISSONS: "Viandes / Poissons",
  CONSOMMABLES_EMBALLAGES: "Consommables / Emballages",
};

type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minThreshold: number;
  costPrice: number;
  allergens: string;
};

export function StockRow({ item }: { item: StockItem }) {
  const [editing, setEditing] = useState(false);
  const [movementType, setMovementType] = useState("IN");

  // La quantité affichée bouge tout de suite ; elle est réconciliée au revalidatePath.
  const [optimisticQty, setOptimisticQty] = useOptimistic(item.quantity);

  async function handleMovement(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const type = String(formData.get("type"));
    const qty = Number(formData.get("quantity"));
    if (!Number.isNaN(qty) && qty >= 0) {
      if (type === "ADJUSTMENT") setOptimisticQty(qty);
      else if (type === "OUT") setOptimisticQty(Math.max(0, optimisticQty - qty));
      else setOptimisticQty(optimisticQty + qty);
    }
    return recordStockMovement(item.id, prevState, formData);
  }

  const [state, formAction, pending] = useActionState(handleMovement, undefined);

  const boundUpdate = updateStockItem.bind(null, item.id);
  const [editState, editAction, editPending] = useActionState(boundUpdate, undefined);
  const wasEditPending = useRef(false);

  // Close the edit form once the update has completed successfully.
  useEffect(() => {
    if (wasEditPending.current && !editPending && !editState?.error) {
      setEditing(false);
    }
    wasEditPending.current = editPending;
  }, [editPending, editState]);

  const isLow = item.minThreshold > 0 && optimisticQty <= item.minThreshold;

  if (editing) {
    return (
      <div className="rounded-lg border border-line p-4">
        <form action={editAction} className="space-y-3">
          <div>
            <Label htmlFor={`name-${item.id}`}>Nom</Label>
            <Input id={`name-${item.id}`} name="name" defaultValue={item.name} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`cat-${item.id}`}>Catégorie</Label>
              <Select id={`cat-${item.id}`} name="category" defaultValue={item.category}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`unit-${item.id}`}>Unité</Label>
              <Input id={`unit-${item.id}`} name="unit" defaultValue={item.unit} required />
            </div>
            <div>
              <Label htmlFor={`qty-${item.id}`}>Quantité</Label>
              <Input
                id={`qty-${item.id}`}
                name="quantity"
                type="number"
                step="any"
                min="0"
                defaultValue={item.quantity}
                required
              />
            </div>
            <div>
              <Label htmlFor={`thr-${item.id}`}>Seuil d&apos;alerte</Label>
              <Input
                id={`thr-${item.id}`}
                name="minThreshold"
                type="number"
                step="any"
                min="0"
                defaultValue={item.minThreshold}
                required
              />
            </div>
            <div>
              <Label htmlFor={`cost-${item.id}`}>Coût unitaire (€)</Label>
              <Input
                id={`cost-${item.id}`}
                name="costPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={item.costPrice}
              />
            </div>
            <div>
              <Label htmlFor={`allerg-${item.id}`}>Allergènes</Label>
              <Input
                id={`allerg-${item.id}`}
                name="allergens"
                defaultValue={item.allergens}
                placeholder="gluten, lait..."
              />
            </div>
          </div>

          {editState?.error && <p className="text-sm text-accent">{editState.error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={editPending}>
              {editPending ? "..." : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{item.name}</p>
          <p className="text-xs text-muted">{categoryLabels[item.category] ?? item.category}</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <ConfirmAction
            action={deleteStockItem.bind(null, item.id)}
            message={`« ${item.name} » sera masqué (suppression réversible).`}
          />
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg font-semibold text-ink tabular-nums">
          {fr(optimisticQty)}
        </span>
        <span className="text-sm text-muted">{item.unit}</span>
        {isLow && (
          <Badge variant="warning" className="ml-auto">
            Seuil : {fr(item.minThreshold)}
          </Badge>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <Select
          name="type"
          value={movementType}
          onChange={(e) => setMovementType(e.target.value)}
          className="h-10 w-32"
        >
          <option value="IN">Entrée</option>
          <option value="OUT">Sortie</option>
          <option value="ADJUSTMENT">Correction</option>
        </Select>
        <Input
          name="quantity"
          type="number"
          step="any"
          min="0"
          placeholder={movementType === "ADJUSTMENT" ? "Nouvelle qté" : "Quantité"}
          required
          className="h-10 w-28"
        />
        {movementType === "IN" && (
          <Input
            name="unitCost"
            type="number"
            step="0.01"
            min="0"
            placeholder="Coût unit. €"
            className="h-10 w-28"
          />
        )}
        <Button type="submit" size="md" variant="secondary" disabled={pending}>
          Valider
        </Button>
        {movementType === "IN" && (
          <label className="flex w-full items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" name="createExpense" className="accent-accent" />
            Enregistrer l&apos;achat en dépense (compta) et recalculer le PMP
          </label>
        )}
      </form>
      {state?.error && <p className="mt-1 text-xs text-accent">{state.error}</p>}
    </div>
  );
}
