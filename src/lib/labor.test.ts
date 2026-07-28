import { describe, it, expect } from "vitest";
import { computeLaborCost, computeLaborRatio, classifyLaborRatio } from "./labor";

describe("labor (masse salariale / CA)", () => {
  it("coût du planning = heures × taux (services de nuit inclus)", () => {
    const cost = computeLaborCost(
      [
        { startTime: "09:00", endTime: "17:00" }, // 8h
        { startTime: "18:00", endTime: "02:00" }, // 8h (passe minuit)
      ],
      12
    );
    expect(cost.toString()).toBe("192"); // 16h × 12€
  });

  it("ratio = coût / CA × 100", () => {
    expect(computeLaborRatio(340, 800)).toBe(42.5);
    expect(computeLaborRatio(240, 800)).toBe(30);
  });

  it("ratio null sans CA", () => {
    expect(computeLaborRatio(340, null)).toBeNull();
    expect(computeLaborRatio(340, 0)).toBeNull();
  });

  it("classe le ratio par rapport à la cible ~30%", () => {
    expect(classifyLaborRatio(22)).toBe("bon");
    expect(classifyLaborRatio(29)).toBe("cible");
    expect(classifyLaborRatio(35)).toBe("eleve");
    expect(classifyLaborRatio(45)).toBe("critique");
    expect(classifyLaborRatio(null)).toBeNull();
  });
});
