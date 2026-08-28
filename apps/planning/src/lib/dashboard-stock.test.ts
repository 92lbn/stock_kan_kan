import { describe, expect, it } from "vitest";
import { stockAlertState, summarizeStockItems } from "./dashboard-stock";

describe("stockAlertState", () => {
  it("distingue rupture, seuil bas et stock normal", () => {
    expect(stockAlertState({ quantity: "0", minThreshold: "2", nextExpiry: null }, "2026-08-28").stock).toBe("out");
    expect(stockAlertState({ quantity: "2", minThreshold: "2", nextExpiry: null }, "2026-08-28").stock).toBe("low");
    expect(stockAlertState({ quantity: "3", minThreshold: "2", nextExpiry: null }, "2026-08-28").stock).toBe("ok");
  });

  it("classe les DLC expirées et urgentes à J-3", () => {
    expect(stockAlertState({ quantity: "1", minThreshold: "0", nextExpiry: "2026-08-27" }, "2026-08-28").expiry).toBe("expired");
    expect(stockAlertState({ quantity: "1", minThreshold: "0", nextExpiry: "2026-08-31" }, "2026-08-28").expiry).toBe("urgent");
    expect(stockAlertState({ quantity: "1", minThreshold: "0", nextExpiry: "2026-09-01" }, "2026-08-28").expiry).toBe("ok");
  });
});

describe("summarizeStockItems", () => {
  it("compte chaque famille d’alerte sans confondre rupture et stock bas", () => {
    const summary = summarizeStockItems([
      { quantity: "0", minThreshold: "2", nextExpiry: null },
      { quantity: "2", minThreshold: "2", nextExpiry: null },
      { quantity: "5", minThreshold: "2", nextExpiry: "2026-08-30" },
      { quantity: "6", minThreshold: "2", nextExpiry: "2026-08-20" },
    ], "2026-08-28");

    expect(summary).toEqual({ total: 4, out: 1, low: 1, expiring: 2 });
  });
});
