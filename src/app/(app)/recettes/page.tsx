import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { RecipesView } from "@/components/recipes-view";

export default async function RecettesPage() {
  // Ouverte à tous : les employés la consultent en lecture seule, l'admin peut éditer.
  const user = await getCurrentUser();
  const canEdit = user.role === "ADMIN";

  const recipes = await db.recipe.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">
        Fichiers &amp; recettes
      </h1>
      <RecipesView recipes={recipes} canEdit={canEdit} />
    </div>
  );
}
