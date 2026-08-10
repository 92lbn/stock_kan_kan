"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { Prisma } from "@stock-kan-kan/db/client";
import { StockCategory, StockMovementType } from "@stock-kan-kan/db/enums";
import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import type { ActionState } from "@stock-kan-kan/lib/action";
import { formatQuantity } from "@stock-kan-kan/lib/money";
import { planFefo } from "@stock-kan-kan/lib/stock-lots";
import { auditData, logAudit } from "@stock-kan-kan/lib/audit";

class MovementError extends Error {}

const decimal3 = z.string().trim().regex(/^\d{1,9}(?:[.,]\d{1,3})?$/).transform((v) => v.replace(",", "."));
const decimal2 = z.string().trim().regex(/^\d{1,10}(?:[.,]\d{1,2})?$/).transform((v) => v.replace(",", "."));
const metadataSchema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(StockCategory),
  unit: z.string().trim().min(1),
  minThreshold: decimal3,
  allergens: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
});
const createSchema = metadataSchema.extend({
  quantity: decimal3,
  costPrice: decimal2,
  expiryDate: z.iso.date().optional(),
  lotNumber: z.string().trim().max(80).optional(),
});
const movementSchema = z.object({
  type: z.enum(StockMovementType),
  quantity: decimal3,
  unitCost: decimal2.optional(),
  expiryDate: z.iso.date().optional(),
  lotNumber: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

const asDateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

export async function findStockItemByBarcode(barcode: string) {
  await requireStockAccess();
  const code = barcode.trim();
  if (!code) return null;
  const item = await db.stockItem.findFirst({
    where: { barcode: code, deletedAt: null },
    select: { id: true, name: true, unit: true, category: true, lots: { where: { quantity: { gt: 0 } } } },
  });
  if (!item) return null;
  const quantity = item.lots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
  return { id: item.id, name: item.name, unit: item.unit, category: item.category as string, quantity: quantity.toString() };
}

export async function createStockItem(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStockAccess();
  const parsed = createSchema.safeParse({
    name: formData.get("name"), category: formData.get("category"), unit: formData.get("unit"),
    quantity: formData.get("quantity"), minThreshold: formData.get("minThreshold"),
    costPrice: formData.get("costPrice") || "0", allergens: formData.get("allergens") || undefined,
    barcode: formData.get("barcode") || undefined, expiryDate: formData.get("expiryDate") || undefined,
    lotNumber: formData.get("lotNumber") || undefined,
  });
  if (!parsed.success) return { error: "Champs invalides." };
  const quantity = new Prisma.Decimal(parsed.data.quantity);
  if (quantity.gt(0) && !parsed.data.expiryDate) return { error: "La DLC du stock initial est requise." };
  const created = await db.$transaction(async (tx) => {
    const item = await tx.stockItem.create({ data: {
      name: parsed.data.name, category: parsed.data.category, unit: parsed.data.unit,
      quantity, minThreshold: parsed.data.minThreshold, costPrice: parsed.data.costPrice,
      allergens: parsed.data.allergens, barcode: parsed.data.barcode,
    }});
    if (quantity.gt(0)) {
      await tx.stockLot.create({ data: { stockItemId: item.id, quantity, expiryDate: asDateOnly(parsed.data.expiryDate!), lotNumber: parsed.data.lotNumber } });
      await tx.stockMovement.create({ data: { stockItemId: item.id, type: "IN", quantity, unitCost: parsed.data.costPrice, note: "Stock initial", createdById: actor.id } });
    }
    return item;
  });
  await logAudit({ userId: actor.id, action: "stock.create", entity: "StockItem", entityId: created.id, after: created });
  revalidateStock();
}

export async function updateStockItem(itemId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStockAccess();
  const parsed = metadataSchema.safeParse({
    name: formData.get("name"), category: formData.get("category"), unit: formData.get("unit"),
    minThreshold: formData.get("minThreshold"), allergens: formData.get("allergens") || undefined,
    barcode: formData.get("barcode") || undefined,
  });
  if (!parsed.success) return { error: "Champs invalides." };
  const before = await db.stockItem.findFirst({ where: { id: itemId, deletedAt: null } });
  if (!before) return { error: "Article introuvable." };
  const updated = await db.stockItem.update({ where: { id: itemId }, data: parsed.data });
  await logAudit({ userId: actor.id, action: "stock.update", entity: "StockItem", entityId: itemId, before, after: updated });
  revalidateStock();
}

export async function deleteStockItem(itemId: string) {
  const actor = await requireStockAccess();
  const before = await db.stockItem.findFirst({ where: { id: itemId, deletedAt: null } });
  if (!before) return;
  await db.stockItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
  await logAudit({ userId: actor.id, action: "stock.delete", entity: "StockItem", entityId: itemId, before });
  revalidateStock();
}

export async function recordStockMovement(stockItemId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStockAccess();
  const parsed = movementSchema.safeParse({
    type: formData.get("type"), quantity: formData.get("quantity"), unitCost: formData.get("unitCost") || undefined,
    expiryDate: formData.get("expiryDate") || undefined, lotNumber: formData.get("lotNumber") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: "Quantité ou DLC invalide." };
  const quantity = new Prisma.Decimal(parsed.data.quantity);
  if (parsed.data.type !== "ADJUSTMENT" && quantity.eq(0)) return { error: "La quantité doit être positive." };
  if ((parsed.data.type === "IN" || parsed.data.type === "ADJUSTMENT") && !parsed.data.expiryDate) {
    return { error: "La DLC est requise pour une entrée ou une correction." };
  }
  try {
    await db.$transaction(async (tx) => {
      const item = await tx.stockItem.findFirst({ where: { id: stockItemId, deletedAt: null }, select: { name: true, unit: true, quantity: true, costPrice: true } });
      if (!item) throw new MovementError("Article introuvable.");
      if (parsed.data.type === "OUT") {
        const lots = await tx.stockLot.findMany({ where: { stockItemId, quantity: { gt: 0 } }, orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }] });
        const plan = planFefo(lots, quantity);
        if (plan.missing.gt(0)) {
          const available = quantity.minus(plan.missing);
          throw new MovementError(`Stock insuffisant : ${formatQuantity(available)} ${item.unit} disponible(s).`);
        }
        const itemUpdate = await tx.stockItem.updateMany({ where: { id: stockItemId, deletedAt: null, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } });
        if (itemUpdate.count !== 1) throw new MovementError("Le stock vient d’être modifié. Réessaie.");
        for (const allocation of plan.allocations) {
          const updated = await tx.stockLot.updateMany({ where: { id: allocation.lotId, quantity: { gte: allocation.quantity } }, data: { quantity: { decrement: allocation.quantity } } });
          if (updated.count !== 1) throw new MovementError("Le stock vient d’être modifié. Réessaie.");
        }
      } else if (parsed.data.type === "IN") {
        await tx.stockLot.create({ data: { stockItemId, quantity, expiryDate: asDateOnly(parsed.data.expiryDate!), lotNumber: parsed.data.lotNumber } });
        const data: Prisma.StockItemUpdateManyMutationInput = { quantity: { increment: quantity } };
        if (parsed.data.unitCost) {
          const newQty = item.quantity.plus(quantity);
          data.costPrice = item.quantity.times(item.costPrice).plus(quantity.times(parsed.data.unitCost)).div(newQty).toDecimalPlaces(2);
        }
        const updated = await tx.stockItem.updateMany({ where: { id: stockItemId, deletedAt: null }, data });
        if (updated.count !== 1) throw new MovementError("Article introuvable.");
      } else {
        await tx.stockLot.updateMany({ where: { stockItemId }, data: { quantity: new Prisma.Decimal(0) } });
        if (quantity.gt(0)) await tx.stockLot.create({ data: { stockItemId, quantity, expiryDate: asDateOnly(parsed.data.expiryDate!), lotNumber: parsed.data.lotNumber } });
        await tx.stockItem.update({ where: { id: stockItemId }, data: { quantity } });
      }
      await tx.stockMovement.create({ data: { stockItemId, type: parsed.data.type, quantity, unitCost: parsed.data.unitCost, note: parsed.data.note, createdById: actor.id } });
      await tx.auditLog.create({ data: auditData({ userId: actor.id, action: `stock.movement.${parsed.data.type.toLowerCase()}`, entity: "StockItem", entityId: stockItemId, after: parsed.data }) });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof MovementError) return { error: error.message };
    console.error("stock_movement_failed", error);
    return { error: "Le mouvement n’a pas pu être enregistré. Réessaie." };
  }
  revalidateStock();
}

function revalidateStock() {
  revalidatePath("/");
  revalidatePath("/stock");
  revalidatePath("/stock/mouvements");
}

export type { ActionState };
