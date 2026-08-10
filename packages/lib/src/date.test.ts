import { describe, it, expect } from "vitest";
import {
  partsInTZ,
  monthRange,
  monthRangeOf,
  toDateOnly,
  toYearMonth,
  daysInMonth,
  formatDateFR,
} from "./date";

describe("date (Europe/Paris)", () => {
  it("parseDateInput stocke un minuit UTC (colonne @db.Date)", () => {
    const d = toDateOnly("2026-07-15");
    expect(d.toISOString()).toBe("2026-07-15T00:00:00.000Z");
    expect(d.getUTCDate()).toBe(15);
  });

  it("heure d'été : un instant tard le soir UTC est déjà le lendemain à Paris", () => {
    // 15 juillet 23:30 UTC = 16 juillet 01:30 à Paris (UTC+2 en été)
    const p = partsInTZ(new Date("2026-07-15T23:30:00Z"));
    expect(p.day).toBe(16);
    expect(p.month).toBe(7);
  });

  it("heure d'hiver : décalage +1 correctement appliqué", () => {
    // 15 janvier 23:30 UTC = 16 janvier 00:30 à Paris (UTC+1 en hiver)
    const p = partsInTZ(new Date("2026-01-15T23:30:00Z"));
    expect(p.day).toBe(16);
    expect(p.month).toBe(1);
  });

  it("monthRange encadre le mois civil parisien (été)", () => {
    const { start, end } = monthRange(new Date("2026-07-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("monthRange : un instant du 1er juillet 00:30 Paris (30 juin 22:30 UTC) tombe en juillet", () => {
    // Sans le passage par le fuseau, l'heure serveur pourrait le classer en juin.
    const { start } = monthRange(new Date("2026-06-30T22:30:00Z"));
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("monthRangeOf parse un YYYY-MM", () => {
    const { start, end } = monthRangeOf("2026-02");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("toYearMonth et daysInMonth", () => {
    expect(toYearMonth(new Date("2026-07-15T12:00:00Z"))).toBe("2026-07");
    expect(daysInMonth(new Date("2026-02-10T12:00:00Z"))).toBe(28);
  });

  it("formatDateFR d'une colonne @db.Date affiche le bon jour", () => {
    expect(formatDateFR(new Date("2026-07-15T00:00:00.000Z"))).toBe("15/07/2026");
  });
});
