import { describe, it, expect } from "vitest";
import { datedShiftsOverlap, sumShiftHours, shiftsOverlap } from "./hours";

describe("shiftsOverlap", () => {
  it("détecte un chevauchement", () => {
    expect(
      shiftsOverlap({ startTime: "10:00", endTime: "14:00" }, { startTime: "12:00", endTime: "16:00" })
    ).toBe(true);
  });
  it("créneaux adjacents ne se chevauchent pas", () => {
    expect(
      shiftsOverlap({ startTime: "09:00", endTime: "12:00" }, { startTime: "12:00", endTime: "15:00" })
    ).toBe(false);
  });
  it("créneaux disjoints", () => {
    expect(
      shiftsOverlap({ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "18:00" })
    ).toBe(false);
  });
  it("chevauchement avec un service de nuit", () => {
    expect(
      shiftsOverlap({ startTime: "18:00", endTime: "02:00" }, { startTime: "23:00", endTime: "23:30" })
    ).toBe(true);
  });
});

describe("datedShiftsOverlap", () => {
  it("détecte un chevauchement avec le service de nuit de la veille", () => {
    expect(datedShiftsOverlap(
      { date: "2026-08-10", startTime: "22:00", endTime: "02:00" },
      { date: "2026-08-11", startTime: "01:00", endTime: "04:00" }
    )).toBe(true);
  });

  it("considère début égal fin comme un créneau nul", () => {
    expect(shiftsOverlap(
      { startTime: "12:00", endTime: "12:00" },
      { startTime: "11:00", endTime: "13:00" }
    )).toBe(false);
  });
});

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
