import { describe, it, expect } from "vitest";
import { addMoney, subtractMoney, multiplyMoney, formatEUR, formatQuantity } from "./money";

// Normalise les espaces insécables produits par Intl pour des assertions stables.
const norm = (s: string) => s.replace(/ | /g, " ");

describe("money", () => {
  it("additionne sans erreur de flottant (0.1 + 0.2 = 0.3)", () => {
    expect(addMoney(0.1, 0.2).toString()).toBe("0.3");
  });

  it("additionne une liste de montants", () => {
    expect(addMoney(10.5, 5.25, 4.25).toString()).toBe("20");
  });

  it("soustrait deux montants", () => {
    expect(subtractMoney(20, 7.5).toString()).toBe("12.5");
  });

  it("multiplie quantité × prix unitaire sans dérive", () => {
    expect(multiplyMoney(3, 19.99).toString()).toBe("59.97");
  });

  it("formate un montant en euros au format français", () => {
    expect(norm(formatEUR(1234.5))).toBe("1 234,50 €");
  });

  it("formate une quantité au format français", () => {
    expect(norm(formatQuantity(1234.5))).toBe("1 234,5");
  });
});
