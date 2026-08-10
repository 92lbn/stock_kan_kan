import { Prisma } from "@stock-kan-kan/db/client";
import { multiplyMoney, type DecimalInput } from "@stock-kan-kan/lib/money";
import { sumShiftHours } from "@stock-kan-kan/lib/hours";

// Ratio masse salariale / CA (liaison compta ↔ planning). Cible ~30 %.

export type ShiftLite = { startTime: string; endTime: string };

/** Coût d'un ensemble de créneaux pour un taux horaire donné. */
export function computeLaborCost(shifts: ShiftLite[], hourlyRate: DecimalInput): Prisma.Decimal {
  return multiplyMoney(sumShiftHours(shifts), hourlyRate);
}

/** Ratio = masse salariale / CA × 100. null si pas de CA. */
export function computeLaborRatio(
  laborCost: DecimalInput,
  revenue: DecimalInput | null | undefined
): number | null {
  if (revenue === null || revenue === undefined) return null;
  const rev = new Prisma.Decimal(revenue);
  if (rev.lte(0)) return null;
  return new Prisma.Decimal(laborCost).div(rev).times(100).toNumber();
}

export type LaborRating = "bon" | "cible" | "eleve" | "critique";

/** Classe un ratio par rapport à la cible ~30 %. */
export function classifyLaborRatio(ratio: number | null): LaborRating | null {
  if (ratio === null) return null;
  if (ratio <= 25) return "bon";
  if (ratio <= 30) return "cible";
  if (ratio <= 40) return "eleve";
  return "critique";
}
