import { classifyExpiry } from "@stock-kan-kan/lib/expiry";
import { Prisma } from "@stock-kan-kan/db/client";

export type DashboardStockAlertSource = {
  quantity: string;
  minThreshold: string;
  nextExpiry: string | null;
};

export function stockAlertState(item: DashboardStockAlertSource, today: string) {
  const quantity = Number(item.quantity);
  const threshold = Number(item.minThreshold);
  const stock = quantity <= 0 ? "out" : threshold > 0 && quantity <= threshold ? "low" : "ok";
  const expiryGroup = item.nextExpiry ? classifyExpiry(item.nextExpiry, today) : null;
  const expiry = expiryGroup === "expired" ? "expired" : expiryGroup === "urgent" ? "urgent" : "ok";
  return { stock, expiry } as const;
}

export function summarizeStockItems(items: DashboardStockAlertSource[], today: string) {
  return items.reduce(
    (summary, item) => {
      const state = stockAlertState(item, today);
      if (state.stock === "out") summary.out += 1;
      else if (state.stock === "low") summary.low += 1;
      if (state.expiry !== "ok") summary.expiring += 1;
      return summary;
    },
    { total: items.length, out: 0, low: 0, expiring: 0 }
  );
}

export function stockQuantityAfterMovement(
  current: Prisma.Decimal | string,
  type: "IN" | "OUT",
  requested: Prisma.Decimal | string
) {
  const currentQuantity = new Prisma.Decimal(current);
  const movementQuantity = new Prisma.Decimal(requested);
  if (movementQuantity.lte(0)) throw new Error("La quantité doit être positive.");
  const next = type === "IN"
    ? currentQuantity.plus(movementQuantity)
    : currentQuantity.minus(movementQuantity);
  if (next.lt(0)) throw new Error("Stock insuffisant.");
  return next;
}
