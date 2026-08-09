import { Suspense } from "react";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { RecipesView } from "@/components/recipes-view";
import { PageSkeleton } from "@/components/ui/skeleton";
import {
  computeMaterialCost,
  computeFoodCostPercent,
  classifyFoodCost,
  computePortionsFeasible,
  mergeAllergens,
} from "@/lib/foodcost";

export default function RecettesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Fichiers &amp; recettes</h1>
      <Suspense fallback={<PageSkeleton />}>
        <RecettesContent />
      </Suspense>
    </div>
  );
}

async function RecettesContent() {
  // Ouverte à tous : les employés la consultent en lecture seule, l'admin peut éditer.
  const user = await getCurrentUser();
  const canEdit = user.role === "ADMIN";

  const [rawRecipes, stockItems] = await Promise.all([
    db.recipe.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }],
      include: {
        recipeIngredients: {
          include: {
            stockItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                costPrice: true,
                quantity: true,
                allergens: true,
              },
            },
          },
        },
      },
    }),
    db.stockItem.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
  ]);

  // Calculs métier côté serveur ; on ne passe que des valeurs sérialisables au client.
  const recipes = rawRecipes.map((r) => {
    const materialCost = computeMaterialCost(
      r.recipeIngredients.map((i) => ({ quantity: i.quantity, costPrice: i.stockItem.costPrice }))
    );
    const foodCostPct = computeFoodCostPercent(materialCost, r.sellingPrice);
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      ingredients: r.ingredients,
      steps: r.steps,
      sellingPrice: r.sellingPrice ? r.sellingPrice.toNumber() : null,
      materialCost: materialCost.toNumber(),
      foodCostPct,
      rating: classifyFoodCost(foodCostPct),
      feasible: computePortionsFeasible(
        r.recipeIngredients.map((i) => ({ needed: i.quantity, available: i.stockItem.quantity }))
      ),
      allergens: mergeAllergens(r.recipeIngredients.map((i) => i.stockItem.allergens)),
      linkedIngredients: r.recipeIngredients.map((i) => ({
        id: i.id,
        name: i.stockItem.name,
        quantity: i.quantity.toNumber(),
        unit: i.unit,
      })),
    };
  });

  return <RecipesView recipes={recipes} canEdit={canEdit} stockItems={stockItems} />;
}
