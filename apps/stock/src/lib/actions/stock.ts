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
import { parseProductImageDataUrl } from "@stock-kan-kan/lib/product-image";
import { IdSchema } from "@stock-kan-kan/lib/schemas";
import { internalBarcodeForItemId } from "@/lib/code128";

class MovementError extends Error {}

export type BarcodeActionState = { error?: string; barcode?: string } | undefined;

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
  imageData: z.string().max(480_000).optional(),
});
const updateSchema = metadataSchema.extend({
  imageData: z.string().max(480_000).optional(),
  removeImage: z.enum(["true", "false"]),
});
const movementSchema = z.object({
  type: z.enum(StockMovementType),
  quantity: decimal3,
  unitCost: decimal2.optional(),
  expiryDate: z.iso.date().optional(),
  lotNumber: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
});
const barcodeSchema = z.string().trim().min(1).max(64);

const asDateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

export async function findStockItemByBarcode(barcode: string) {
  await requireStockAccess();
  const parsed = barcodeSchema.safeParse(barcode);
  if (!parsed.success) return null;
  const item = await db.stockItem.findFirst({
    where: { barcode: parsed.data, deletedAt: null },
    select: { id: true, name: true, unit: true, category: true, lots: { where: { quantity: { gt: 0 } } } },
  });
  if (!item) return null;
  const quantity = item.lots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
  return { id: item.id, name: item.name, unit: item.unit, category: item.category as string, quantity: quantity.toString() };
}

export async function createInternalBarcode(
  itemId: string,
  _state: BarcodeActionState,
  _formData: FormData,
): Promise<BarcodeActionState> {
  const actor = await requireStockAccess();
  void _state;
  void _formData;
  const parsedId = IdSchema.safeParse(itemId);
  if (!parsedId.success) return { error: "Article invalide." };

  try {
    const result = await db.$transaction(async (tx) => {
      const before = await tx.stockItem.findFirst({
        where: { id: parsedId.data, deletedAt: null },
        select: { id: true, name: true, barcode: true },
      });
      if (!before) return { error: "Article introuvable." };
      if (before.barcode?.startsWith("KAN-")) return { barcode: before.barcode };
      if (before.barcode) return { error: "Ce produit possède déjà un code-barres fabricant." };

      const barcode = internalBarcodeForItemId(before.id);
      const updated = await tx.stockItem.updateMany({
        where: { id: before.id, deletedAt: null, barcode: null },
        data: { barcode },
      });
      if (updated.count !== 1) return { error: "La fiche vient d’être modifiée. Réessaie." };
      await tx.auditLog.create({
        data: auditData({
          userId: actor.id,
          action: "stock.internal_barcode.create",
          entity: "StockItem",
          entityId: before.id,
          before,
          after: { ...before, barcode },
        }),
      });
      return { barcode };
    });
    if (result.error) return { error: result.error };
    revalidateStock();
    return { barcode: result.barcode };
  } catch (error) {
    console.error("stock_internal_barcode_failed", error);
    return { error: "L’étiquette n’a pas pu être créée. Réessaie." };
  }
}


export async function createStockItem(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStockAccess();
  const parsed = createSchema.safeParse({
    name: formData.get("name"), category: formData.get("category"), unit: formData.get("unit"),
    quantity: formData.get("quantity"), minThreshold: formData.get("minThreshold"),
    costPrice: formData.get("costPrice") || "0", allergens: formData.get("allergens") || undefined,
    barcode: formData.get("barcode") || undefined, expiryDate: formData.get("expiryDate") || undefined,
    lotNumber: formData.get("lotNumber") || undefined, imageData: formData.get("imageData") || undefined,
  });
  if (!parsed.success) return { error: "Champs invalides." };
  let image;
  try {
    image = parseProductImageDataUrl(parsed.data.imageData);
  } catch (reason) {
    return { error: reason instanceof Error ? reason.message : "Photo invalide." };
  }
  const quantity = new Prisma.Decimal(parsed.data.quantity);
  const created = await db.$transaction(async (tx) => {
    const item = await tx.stockItem.create({ data: {
      name: parsed.data.name, category: parsed.data.category, unit: parsed.data.unit,
      quantity, minThreshold: parsed.data.minThreshold, costPrice: parsed.data.costPrice,
      allergens: parsed.data.allergens, barcode: parsed.data.barcode,
      imageData: image?.bytes, imageMimeType: image?.mimeType,
    }, select: { id: true, name: true, category: true, unit: true, quantity: true, minThreshold: true, costPrice: true, allergens: true, barcode: true, imageMimeType: true, createdAt: true, updatedAt: true }});
    if (quantity.gt(0)) {
      await tx.stockLot.create({ data: { stockItemId: item.id, quantity, expiryDate: parsed.data.expiryDate ? asDateOnly(parsed.data.expiryDate) : null, lotNumber: parsed.data.lotNumber } });
      await tx.stockMovement.create({ data: { stockItemId: item.id, type: "IN", quantity, unitCost: parsed.data.costPrice, note: "Stock initial", createdById: actor.id } });
    }
    return item;
  });
  await logAudit({ userId: actor.id, action: "stock.create", entity: "StockItem", entityId: created.id, after: created });
  revalidateStock();
}

export async function updateStockItem(itemId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStockAccess();
  const parsedId = IdSchema.safeParse(itemId);
  if (!parsedId.success) return { error: "Article invalide." };
  const parsed = updateSchema.safeParse({
    name: formData.get("name"), category: formData.get("category"), unit: formData.get("unit"),
    minThreshold: formData.get("minThreshold"), allergens: formData.get("allergens") || undefined,
    barcode: formData.get("barcode") || undefined, imageData: formData.get("imageData") || undefined,
    removeImage: formData.get("removeImage") || "false",
  });
  if (!parsed.success) return { error: "Champs invalides." };
  let image;
  try {
    image = parseProductImageDataUrl(parsed.data.imageData);
  } catch (reason) {
    return { error: reason instanceof Error ? reason.message : "Photo invalide." };
  }
  const itemSelect = { id: true, name: true, category: true, unit: true, quantity: true, minThreshold: true, costPrice: true, allergens: true, barcode: true, imageMimeType: true, deletedAt: true, createdAt: true, updatedAt: true } as const;
  const before = await db.stockItem.findFirst({ where: { id: parsedId.data, deletedAt: null }, select: itemSelect });
  if (!before) return { error: "Article introuvable." };
  const { removeImage } = parsed.data;
  const updated = await db.stockItem.update({
    where: { id: parsedId.data },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      minThreshold: parsed.data.minThreshold,
      allergens: parsed.data.allergens,
      barcode: parsed.data.barcode,
      ...(image ? { imageData: image.bytes, imageMimeType: image.mimeType } : {}),
      ...(removeImage === "true" ? { imageData: null, imageMimeType: null } : {}),
    },
    select: itemSelect,
  });
  await logAudit({ userId: actor.id, action: "stock.update", entity: "StockItem", entityId: parsedId.data, before, after: updated });
  revalidateStock();
}

export async function deleteStockItem(itemId: string) {
  const actor = await requireStockAccess();
  const parsedId = IdSchema.safeParse(itemId);
  if (!parsedId.success) return { error: "Article invalide." };
  const before = await db.stockItem.findFirst({ where: { id: parsedId.data, deletedAt: null } });
  if (!before) return { error: "Article introuvable." };
  await db.stockItem.update({ where: { id: parsedId.data }, data: { deletedAt: new Date() } });
  await logAudit({ userId: actor.id, action: "stock.delete", entity: "StockItem", entityId: parsedId.data, before });
  revalidateStock();
}

export async function recordStockMovement(stockItemId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStockAccess();
  const parsedId = IdSchema.safeParse(stockItemId);
  if (!parsedId.success) return { error: "Article invalide." };
  const parsed = movementSchema.safeParse({
    type: formData.get("type"), quantity: formData.get("quantity"), unitCost: formData.get("unitCost") || undefined,
    expiryDate: formData.get("expiryDate") || undefined, lotNumber: formData.get("lotNumber") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: "Quantité ou DLC invalide." };
  const quantity = new Prisma.Decimal(parsed.data.quantity);
  if (parsed.data.type !== "ADJUSTMENT" && quantity.eq(0)) return { error: "La quantité doit être positive." };
  try {
    await db.$transaction(async (tx) => {
      const item = await tx.stockItem.findFirst({ where: { id: parsedId.data, deletedAt: null }, select: { name: true, unit: true, quantity: true, costPrice: true } });
      if (!item) throw new MovementError("Article introuvable.");
      if (parsed.data.type === "OUT") {
        const lots = await tx.stockLot.findMany({ where: { stockItemId: parsedId.data, quantity: { gt: 0 } }, orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] });
        const plan = planFefo(lots, quantity);
        if (plan.missing.gt(0)) {
          const available = quantity.minus(plan.missing);
          throw new MovementError(`Stock insuffisant : ${formatQuantity(available)} ${item.unit} disponible(s).`);
        }
        const itemUpdate = await tx.stockItem.updateMany({ where: { id: parsedId.data, deletedAt: null, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } });
        if (itemUpdate.count !== 1) throw new MovementError("Le stock vient d’être modifié. Réessaie.");
        for (const allocation of plan.allocations) {
          const updated = await tx.stockLot.updateMany({ where: { id: allocation.lotId, quantity: { gte: allocation.quantity } }, data: { quantity: { decrement: allocation.quantity } } });
          if (updated.count !== 1) throw new MovementError("Le stock vient d’être modifié. Réessaie.");
        }
      } else if (parsed.data.type === "IN") {
        await tx.stockLot.create({ data: { stockItemId: parsedId.data, quantity, expiryDate: parsed.data.expiryDate ? asDateOnly(parsed.data.expiryDate) : null, lotNumber: parsed.data.lotNumber } });
        const data: Prisma.StockItemUpdateManyMutationInput = { quantity: { increment: quantity } };
        if (parsed.data.unitCost) {
          const newQty = item.quantity.plus(quantity);
          data.costPrice = item.quantity.times(item.costPrice).plus(quantity.times(parsed.data.unitCost)).div(newQty).toDecimalPlaces(2);
        }
        const updated = await tx.stockItem.updateMany({ where: { id: parsedId.data, deletedAt: null }, data });
        if (updated.count !== 1) throw new MovementError("Article introuvable.");
      } else {
        await tx.stockLot.updateMany({ where: { stockItemId: parsedId.data }, data: { quantity: new Prisma.Decimal(0) } });
        if (quantity.gt(0)) await tx.stockLot.create({ data: { stockItemId: parsedId.data, quantity, expiryDate: parsed.data.expiryDate ? asDateOnly(parsed.data.expiryDate) : null, lotNumber: parsed.data.lotNumber } });
        await tx.stockItem.update({ where: { id: parsedId.data }, data: { quantity } });
      }
      await tx.stockMovement.create({ data: { stockItemId: parsedId.data, type: parsed.data.type, quantity, unitCost: parsed.data.unitCost, note: parsed.data.note, createdById: actor.id } });
      await tx.auditLog.create({ data: auditData({ userId: actor.id, action: `stock.movement.${parsed.data.type.toLowerCase()}`, entity: "StockItem", entityId: parsedId.data, after: parsed.data }) });
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
  revalidatePath("/stock/etiquettes");
}
