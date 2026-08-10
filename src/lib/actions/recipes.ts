"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { requireAdmin } from "@stock-kan-kan/auth/dal";
import { formatQuantity } from "@stock-kan-kan/lib/money";
import { logAudit } from "@stock-kan-kan/lib/audit";
import { RecipeCategory } from "@stock-kan-kan/db/enums";
import type { ActionState } from "@/lib/actions/stock";

class ProductionError extends Error {}

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

// ---------- Liaison Recettes ↔ Stock ----------

const SellingPriceSchema = z.object({
  sellingPrice: z.coerce.number().min(0),
});

export async function updateRecipeSellingPrice(
  recipeId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = SellingPriceSchema.safeParse({ sellingPrice: formData.get("sellingPrice") });
  if (!parsed.success) return { error: "Prix invalide." };

  await db.recipe.update({
    where: { id: recipeId },
    data: { sellingPrice: parsed.data.sellingPrice },
  });
  revalidatePath("/recettes");
  return undefined;
}

const IngredientSchema = z.object({
  stockItemId: z.string().min(1),
  quantity: z.coerce.number().positive({ error: "Quantité invalide." }),
});

export async function addRecipeIngredient(
  recipeId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = IngredientSchema.safeParse({
    stockItemId: formData.get("stockItemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: "Ingrédient invalide." };

  const item = await db.stockItem.findUnique({
    where: { id: parsed.data.stockItemId },
    select: { unit: true, deletedAt: true },
  });
  if (!item || item.deletedAt) return { error: "Article de stock introuvable." };

  await db.recipeIngredient.upsert({
    where: { recipeId_stockItemId: { recipeId, stockItemId: parsed.data.stockItemId } },
    create: {
      recipeId,
      stockItemId: parsed.data.stockItemId,
      quantity: parsed.data.quantity,
      unit: item.unit,
    },
    update: { quantity: parsed.data.quantity, unit: item.unit },
  });
  revalidatePath("/recettes");
  return undefined;
}

export async function removeRecipeIngredient(ingredientId: string) {
  await requireAdmin();
  await db.recipeIngredient.delete({ where: { id: ingredientId } });
  revalidatePath("/recettes");
}

// Production : décrémente chaque ingrédient du stock (× portions) dans une transaction,
// refuse si un ingrédient est insuffisant, et trace un mouvement OUT par ingrédient.
export async function recordProduction(
  recipeId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const portions = Number(formData.get("portions"));
  if (!Number.isFinite(portions) || portions <= 0) {
    return { error: "Nombre de portions invalide." };
  }

  try {
    await db.$transaction(async (tx) => {
      const ingredients = await tx.recipeIngredient.findMany({
        where: { recipeId },
        include: { stockItem: { select: { id: true, name: true, unit: true, quantity: true } } },
      });
      if (ingredients.length === 0) {
        throw new ProductionError("Cette recette n'a pas d'ingrédients reliés au stock.");
      }

      for (const ing of ingredients) {
        const needed = ing.quantity.times(portions);
        if (ing.stockItem.quantity.lt(needed)) {
          throw new ProductionError(
            `Stock insuffisant pour ${ing.stockItem.name} : ${formatQuantity(
              ing.stockItem.quantity
            )} ${ing.stockItem.unit} disponible(s), ${formatQuantity(needed)} requis.`
          );
        }
      }

      for (const ing of ingredients) {
        const needed = ing.quantity.times(portions);
        await tx.stockItem.update({
          where: { id: ing.stockItemId },
          data: { quantity: { decrement: needed } },
        });
        await tx.stockMovement.create({
          data: {
            stockItemId: ing.stockItemId,
            type: "OUT",
            quantity: needed,
            note: `Production ×${portions}`,
            createdById: admin.id,
          },
        });
      }
    });
  } catch (e) {
    if (e instanceof ProductionError) return { error: e.message };
    throw e;
  }

  await logAudit({
    userId: admin.id,
    action: "recipe.production",
    entity: "Recipe",
    entityId: recipeId,
    after: { portions },
  });
  revalidatePath("/recettes");
  revalidatePath("/stock");
  revalidatePath("/");
  return undefined;
}
