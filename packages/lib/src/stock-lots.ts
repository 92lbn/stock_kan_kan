import { Prisma } from "@stock-kan-kan/db/client";

export type FefoLot = { id: string; expiryDate: Date | string | null; quantity: Prisma.Decimal | string };
export type FefoAllocation = { lotId: string; quantity: Prisma.Decimal };

export function planFefo(lots: FefoLot[], requested: Prisma.Decimal | string) {
  let remaining = new Prisma.Decimal(requested);
  if (remaining.lte(0)) throw new Error("La quantité doit être positive.");
  const allocations: FefoAllocation[] = [];
  const ordered = [...lots].sort((a, b) => {
    if (a.expiryDate === null) return b.expiryDate === null ? 0 : 1;
    if (b.expiryDate === null) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
  for (const lot of ordered) {
    if (remaining.lte(0)) break;
    const available = new Prisma.Decimal(lot.quantity);
    if (available.lte(0)) continue;
    const take = Prisma.Decimal.min(available, remaining);
    allocations.push({ lotId: lot.id, quantity: take });
    remaining = remaining.minus(take);
  }
  return { allocations, missing: remaining };
}
