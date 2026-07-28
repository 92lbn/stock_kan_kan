import { describe, it, expect } from "vitest";
import {
  computeMaterialCost,
  computeFoodCostPercent,
  classifyFoodCost,
  computePortionsFeasible,
  computeMargin,
  mergeAllergens,
} from "./foodcost";

describe("foodcost", () => {
  it("coût matière = somme(quantité × coût unitaire)", () => {
    const cost = computeMaterialCost([
      { quantity: 0.2, costPrice: 12 }, // 2.4
      { quantity: 1, costPrice: 0.5 }, // 0.5
      { quantity: 3, costPrice: 0.1 }, // 0.3
    ]);
    expect(cost.toString()).toBe("3.2");
  });

  it("food cost % = coût matière / prix de vente", () => {
    expect(computeFoodCostPercent(3, 12)).toBe(25);
    expect(computeFoodCostPercent(4, 10)).toBe(40);
  });

  it("food cost % null si pas de prix ou prix <= 0", () => {
    expect(computeFoodCostPercent(3, null)).toBeNull();
    expect(computeFoodCostPercent(3, 0)).toBeNull();
  });

  it("classe le food cost par rapport à la cible", () => {
    expect(classifyFoodCost(20)).toBe("bon");
    expect(classifyFoodCost(30)).toBe("correct");
    expect(classifyFoodCost(38)).toBe("eleve");
    expect(classifyFoodCost(50)).toBe("critique");
    expect(classifyFoodCost(null)).toBeNull();
  });

  it("portions réalisables = min(floor(dispo / nécessaire))", () => {
    expect(
      computePortionsFeasible([
        { needed: 0.2, available: 5 }, // 25
        { needed: 1, available: 8 }, // 8  ← contrainte
        { needed: 3, available: 40 }, // 13
      ])
    ).toBe(8);
  });

  it("0 portion si un ingrédient est en rupture", () => {
    expect(
      computePortionsFeasible([
        { needed: 1, available: 0 },
        { needed: 1, available: 10 },
      ])
    ).toBe(0);
  });

  it("marge = prix de vente − coût matière", () => {
    expect(computeMargin(3.2, 12).toString()).toBe("8.8");
  });

  it("fusionne et dédoublonne les allergènes", () => {
    expect(mergeAllergens(["Gluten, lait", "LAIT; œuf", null, ""])).toEqual([
      "gluten",
      "lait",
      "œuf",
    ]);
  });
});
