"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { RecipeCategory } from "@/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/stock";

const RecipeSchema = z.object({
  title: z.string().trim().min(1),
  category: z.enum(RecipeCategory),
  ingredients: z.string().trim(),
  steps: z.string().trim(),
});

export async function createRecipe(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = RecipeSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    ingredients: formData.get("ingredients") ?? "",
    steps: formData.get("steps") ?? "",
  });

  if (!parsed.success) {
    return { error: "Titre et catégorie requis." };
  }

  await db.recipe.create({ data: parsed.data });
  revalidatePath("/recettes");
  return undefined;
}

export async function updateRecipe(
  recipeId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = RecipeSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    ingredients: formData.get("ingredients") ?? "",
    steps: formData.get("steps") ?? "",
  });

  if (!parsed.success) {
    return { error: "Titre et catégorie requis." };
  }

  await db.recipe.update({ where: { id: recipeId }, data: parsed.data });
  revalidatePath("/recettes");
  return undefined;
}

export async function deleteRecipe(recipeId: string) {
  await requireAdmin();
  await db.recipe.delete({ where: { id: recipeId } });
  revalidatePath("/recettes");
}
