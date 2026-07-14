import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { RecipesView } from "@/components/recipes-view";

export default async function RecettesPage() {
  await requireAdmin();

  const recipes = await db.recipe.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Fichiers &amp; recettes
      </h1>
      <RecipesView recipes={recipes} canEdit />
    </div>
  );
}
