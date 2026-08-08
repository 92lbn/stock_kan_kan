"use client";

import { useActionState } from "react";
import {
  addRecipeIngredient,
  removeRecipeIngredient,
  updateRecipeSellingPrice,
  recordProduction,
} from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";
import { ConfirmAction } from "@/components/confirm-action";
import type { RecipeVM, StockItemLite } from "@/components/recipes-view";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const qty = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

const ratingLabel: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  bon: { label: "Food cost bon", variant: "success" },
  correct: { label: "Food cost correct", variant: "default" },
  eleve: { label: "Food cost élevé", variant: "warning" },
  critique: { label: "Food cost critique", variant: "danger" },
};

export function RecipeFiche({
  recipe,
  canEdit,
  stockItems,
}: {
  recipe: RecipeVM;
  canEdit: boolean;
  stockItems: StockItemLite[];
}) {
  const [priceState, priceAction] = useActionState(
    updateRecipeSellingPrice.bind(null, recipe.id),
    undefined
  );
  const [addState, addAction] = useActionState(
    addRecipeIngredient.bind(null, recipe.id),
    undefined
  );
  const [prodState, prodAction, prodPending] = useActionState(
    recordProduction.bind(null, recipe.id),
    undefined
  );

  const rating = recipe.rating ? ratingLabel[recipe.rating] : null;

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      {/* Fiche technique : coût matière, prix de vente, food cost %, faisabilité. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="kpi-label">Coût matière</p>
          <p className="num text-lg font-semibold text-ink">{eur.format(recipe.materialCost)}</p>
        </div>
        <div>
          <p className="kpi-label">Prix de vente</p>
          <p className="num text-lg font-semibold text-ink">
            {recipe.sellingPrice !== null ? eur.format(recipe.sellingPrice) : "—"}
          </p>
        </div>
        <div>
          <p className="kpi-label">Food cost</p>
          <p className="num text-lg font-semibold text-ink">
            {recipe.foodCostPct !== null ? `${recipe.foodCostPct.toFixed(0)} %` : "—"}
          </p>
        </div>
        <div>
          <p className="kpi-label">Réalisable</p>
          <p className="num text-lg font-semibold text-ink">{recipe.feasible} portion(s)</p>
        </div>
      </div>

      {rating && <Badge variant={rating.variant}>{rating.label}</Badge>}

      {recipe.allergens.length > 0 && (
        <div>
          <p className="kpi-label mb-1">Allergènes</p>
          <div className="flex flex-wrap gap-1">
            {recipe.allergens.map((a) => (
              <Badge key={a} variant="warning" className="capitalize">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Ingrédients reliés au stock. */}
      <div>
        <p className="kpi-label mb-1">Ingrédients (stock)</p>
        {recipe.linkedIngredients.length === 0 ? (
          <p className="text-xs text-muted">Aucun ingrédient relié au stock.</p>
        ) : (
          <ul className="space-y-1">
            {recipe.linkedIngredients.map((ing) => (
              <li key={ing.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink">
                  <span className="num">{qty.format(ing.quantity)}</span> {ing.unit} — {ing.name}
                </span>
                {canEdit && (
                  <ConfirmAction
                    action={removeRecipeIngredient.bind(null, ing.id)}
                    title="Retirer cet ingrédient ?"
                    message={`« ${ing.name} » sera retiré de la fiche.`}
                    triggerLabel="✕"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && (
        <div className="space-y-2 rounded-md bg-card-2 p-3">
          {/* Prix de vente. */}
          <form action={priceAction} className="flex items-end gap-2">
            <label className="flex-1 text-xs text-muted">
              Prix de vente (€)
              <Input
                name="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={recipe.sellingPrice ?? ""}
                className="mt-0.5 h-9"
              />
            </label>
            <Button type="submit" size="sm" variant="secondary">
              OK
            </Button>
          </form>
          {priceState?.error && <p className="text-xs text-danger">{priceState.error}</p>}

          {/* Ajout d'un ingrédient. */}
          <form action={addAction} className="flex items-end gap-2">
            <label className="flex-1 text-xs text-muted">
              Ingrédient
              <Select name="stockItemId" className="mt-0.5 h-9" required>
                <option value="">Choisir un article…</option>
                {stockItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.unit})
                  </option>
                ))}
              </Select>
            </label>
            <label className="w-24 text-xs text-muted">
              Qté/portion
              <Input name="quantity" type="number" step="any" min="0" className="mt-0.5 h-9" required />
            </label>
            <Button type="submit" size="sm" variant="secondary">
              Ajouter
            </Button>
          </form>
          {addState?.error && <p className="text-xs text-danger">{addState.error}</p>}

          {/* Production : décrément du stock. */}
          <form action={prodAction} className="flex items-end gap-2">
            <label className="w-32 text-xs text-muted">
              Production (portions)
              <Input name="portions" type="number" step="1" min="1" className="mt-0.5 h-9" required />
            </label>
            <Button type="submit" size="sm" disabled={prodPending}>
              {prodPending ? "…" : "Décrémenter le stock"}
            </Button>
          </form>
          {prodState?.error && <p className="text-xs text-danger">{prodState.error}</p>}
        </div>
      )}
    </div>
  );
}
