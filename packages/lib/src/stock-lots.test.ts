import { describe, expect, it } from "vitest";
import { classifyExpiry, daysUntilExpiry } from "./expiry";
import { planFefo } from "./stock-lots";

describe("classement des DLC", () => {
  it("classe les lots périmés, urgents, proches et lointains", () => {
    expect(classifyExpiry("2026-08-09", "2026-08-10")).toBe("expired");
    expect(classifyExpiry("2026-08-13", "2026-08-10")).toBe("urgent");
    expect(classifyExpiry("2026-08-17", "2026-08-10")).toBe("soon");
    expect(classifyExpiry("2026-08-18", "2026-08-10")).toBe("later");
    expect(daysUntilExpiry("2026-10-25", "2026-10-24")).toBe(1);
  });
});

describe("FEFO", () => {
  it("consomme d'abord la DLC la plus proche", () => {
    const result = planFefo([
      { id: "late", expiryDate: "2026-08-20", quantity: "5" },
      { id: "first", expiryDate: "2026-08-12", quantity: "2" },
    ], "4");
    expect(result.allocations.map((a) => [a.lotId, a.quantity.toString()])).toEqual([
      ["first", "2"], ["late", "2"],
    ]);
    expect(result.missing.toString()).toBe("0");
  });

  it("signale le manque sans produire une quantité négative", () => {
    const result = planFefo([{ id: "one", expiryDate: "2026-08-12", quantity: "1.5" }], "2");
    expect(result.missing.toString()).toBe("0.5");
  });

  it("consomme les lots datés avant les produits sans date", () => {
    const result = planFefo([
      { id: "sans-date", expiryDate: null, quantity: "5" },
      { id: "date", expiryDate: "2026-08-12", quantity: "2" },
    ], "3");
    expect(result.allocations.map((a) => [a.lotId, a.quantity.toString()])).toEqual([
      ["date", "2"], ["sans-date", "1"],
    ]);
  });
});
