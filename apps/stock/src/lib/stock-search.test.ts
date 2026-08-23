import { describe, expect, it } from "vitest";
import { searchStockItems } from "./stock-search";

const items = [
  { name: "Tomates fraîches", category: "LEGUMES_FRAIS", barcode: "" },
  { name: "Pâte à tartiner", category: "EPICERIE", barcode: "3017620422003" },
];

describe("searchStockItems", () => {
  it("retrouve un produit sans tenir compte des accents", () => {
    expect(searchStockItems(items, "tomates fraiches")).toEqual([items[0]]);
  });

  it("retrouve aussi un produit par son code-barres", () => {
    expect(searchStockItems(items, "3017620422003")).toEqual([items[1]]);
  });

  it("accepte plusieurs termes dans n’importe quelle partie de la fiche", () => {
    expect(searchStockItems(items, "pate epicerie")).toEqual([items[1]]);
  });
});
