import { describe, it, expect } from "vitest";
import { sumShiftHours } from "./hours";

describe("sumShiftHours", () => {
  it("compte un service de jour", () => {
    expect(sumShiftHours([{ startTime: "09:00", endTime: "17:00" }])).toBe(8);
  });

  it("compte un service du soir qui passe minuit", () => {
    expect(sumShiftHours([{ startTime: "18:00", endTime: "02:00" }])).toBe(8);
  });

  it("compte un service de nuit qui passe minuit", () => {
    expect(sumShiftHours([{ startTime: "22:00", endTime: "06:00" }])).toBe(8);
  });

  it("compte un créneau de durée nulle comme 0h", () => {
    expect(sumShiftHours([{ startTime: "12:00", endTime: "12:00" }])).toBe(0);
  });

  it("additionne plusieurs créneaux, jour et nuit mêlés", () => {
    expect(
      sumShiftHours([
        { startTime: "09:00", endTime: "17:00" }, // 8h
        { startTime: "18:00", endTime: "02:00" }, // 8h
      ])
    ).toBe(16);
  });
});
