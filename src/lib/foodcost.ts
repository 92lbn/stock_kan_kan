import { Prisma } from "@/generated/prisma/client";
import { addMoney, multiplyMoney, type DecimalInput } from "@/lib/money";

// Calculs métier de la liaison Recettes ↔ Stock. Fonctions pures et testées.

export type IngredientCost = {
  quantity: DecimalInput; // quantité par portion
  costPrice: DecimalInput; // coût unitaire de l'article de stock
};

/** Coût matière d'une portion = somme(quantité × coût unitaire). */
export function computeMaterialCost(ingredients: IngredientCost[]): Prisma.Decimal {
  return ingredients.reduce<Prisma.Decimal>(
    (sum, ing) => sum.plus(multiplyMoney(ing.quantity, ing.costPrice)),
    new Prisma.Decimal(0)
  );
}

/**
 * Food cost % = coût matière / prix de vente × 100. Retourne null si pas de prix.
 * Cible 25-32 %.
 */
export function computeFoodCostPercent(
  materialCost: DecimalInput,
  sellingPrice: DecimalInput | null | undefined
): number | null {
  if (sellingPrice === null || sellingPrice === undefined) return null;
  const price = new Prisma.Decimal(sellingPrice);
  if (price.lte(0)) return null;
  return new Prisma.Decimal(materialCost).div(price).times(100).toNumber();
}

export type FoodCostRating = "bon" | "correct" | "eleve" | "critique";

/** Classe un food cost % par rapport à la cible restauration (25-32 %). */
export function classifyFoodCost(percent: number | null): FoodCostRating | null {
  if (percent === null) return null;
  if (percent <= 25) return "bon";
  if (percent <= 32) return "correct";
  if (percent <= 40) return "eleve";
  return "critique";
}

export type IngredientStock = {
  needed: DecimalInput; // quantité par portion
  available: DecimalInput; // quantité en stock
};

/**
 * Nombre de portions encore réalisables avec le stock courant : le minimum, sur
 * tous les ingrédients, de floor(disponible / nécessaire). 0 si un ingrédient manque.
 */
export function computePortionsFeasible(ingredients: IngredientStock[]): number {
  if (ingredients.length === 0) return 0;
  let min = Infinity;
  for (const ing of ingredients) {
    const needed = new Prisma.Decimal(ing.needed);
    if (needed.lte(0)) continue; // un ingrédient à 0 par portion n'est pas contraignant
    const portions = new Prisma.Decimal(ing.available).div(needed).floor().toNumber();
    if (portions < min) min = portions;
  }
  return min === Infinity ? 0 : Math.max(0, min);
}

/** Marge unitaire = prix de vente − coût matière. */
export function computeMargin(
  materialCost: DecimalInput,
  sellingPrice: DecimalInput
): Prisma.Decimal {
  return new Prisma.Decimal(sellingPrice).minus(new Prisma.Decimal(materialCost));
}

/** Union des allergènes (dédupliqués, triés) d'une liste de chaînes libres. */
export function mergeAllergens(sources: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const s of sources) {
    if (!s) continue;
    for (const part of s.split(/[,;]/)) {
      const trimmed = part.trim();
      if (trimmed) set.add(trimmed.toLowerCase());
    }
  }
  return [...set].sort();
}

// Réexport pour les tests / appelants (évite un import direct de money partout).
export { addMoney };
