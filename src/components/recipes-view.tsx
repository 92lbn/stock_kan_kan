"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { RecipeForm } from "@/components/recipe-form";
import { RecipeCard } from "@/components/recipe-card";
import type { FoodCostRating } from "@/lib/foodcost";

export type StockItemLite = { id: string; name: string; unit: string };

export type RecipeVM = {
  id: string;
  title: string;
  category: string;
  ingredients: string;
  steps: string;
  sellingPrice: number | null;
  materialCost: number;
  foodCostPct: number | null;
  rating: FoodCostRating | null;
  feasible: number;
  allergens: string[];
  linkedIngredients: { id: string; name: string; quantity: number; unit: string }[];
};

const TABS = [
  { value: "MENU", label: "Menu / Carte" },
  { value: "BOISSON", label: "Boissons" },
  { value: "MARINADE", label: "Marinades" },
];

export function RecipesView({
  recipes,
  canEdit,
  stockItems,
}: {
  recipes: RecipeVM[];
  canEdit: boolean;
  stockItems: StockItemLite[];
}) {
  const [tab, setTab] = useState("MENU");
  const filtered = recipes.filter((r) => r.category === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-sm border border-line p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium",
              tab === t.value ? "bg-ink text-surface" : "text-muted hover:bg-card"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {canEdit && (
        <Card>
          <h2 className="mb-3 font-semibold text-ink">Nouvelle fiche</h2>
          <RecipeForm defaultCategory={tab} />
        </Card>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Aucune fiche dans cette catégorie.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              canEdit={canEdit}
              stockItems={stockItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}
