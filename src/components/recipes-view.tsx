"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { RecipeForm } from "@/components/recipe-form";
import { RecipeCard } from "@/components/recipe-card";

type Recipe = {
  id: string;
  title: string;
  category: string;
  ingredients: string;
  steps: string;
};

const TABS = [
  { value: "MENU", label: "Menu / Carte" },
  { value: "BOISSON", label: "Boissons" },
  { value: "MARINADE", label: "Marinades" },
];

export function RecipesView({ recipes, canEdit }: { recipes: Recipe[]; canEdit: boolean }) {
  const [tab, setTab] = useState("MENU");
  const filtered = recipes.filter((r) => r.category === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium",
              tab === t.value
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {canEdit && (
        <Card>
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Nouvelle fiche</h2>
          <RecipeForm defaultCategory={tab} />
        </Card>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune fiche dans cette catégorie.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
