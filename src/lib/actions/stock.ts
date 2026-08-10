"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { Prisma } from "@stock-kan-kan/db/client";
import { requireAdmin } from "@stock-kan-kan/auth/dal";
import { formatQuantity } from "@stock-kan-kan/lib/money";
import { toDateOnly } from "@stock-kan-kan/lib/date";
import { logAudit } from "@stock-kan-kan/lib/audit";
import { StockCategory, StockMovementType } from "@stock-kan-kan/db/enums";

// Erreur métier propagée hors de la transaction interactive pour un retour typé.
class MovementError extends Error {}

const StockItemSchema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(StockCategory),
  unit: z.string().trim().min(1),
  quantity: z.coerce.number().min(0),
  minThreshold: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).default(0),
  allergens: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
});

// Recherche d'un article par code-barres (scan). Renvoie une forme sérialisable ou null.
export async function findStockItemByBarcode(barcode: string) {
  await requireAdmin();
  const code = barcode.trim();
  if (!code) return null;
  const item = await db.stockItem.findFirst({
    where: { barcode: code, deletedAt: null },
    select: { id: true, name: true, unit: true, quantity: true, category: true },
  });
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    category: item.category as string,
    quantity: item.quantity.toNumber(),
  };
}

export type ActionState = { error: string } | undefined;

export async function createStockItem(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = StockItemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    quantity: formData.get("quantity"),
    minThreshold: formData.get("minThreshold"),
    costPrice: formData.get("costPrice") ?? 0,
    allergens: formData.get("allergens") || undefined,
    barcode: formData.get("barcode") || undefined,
  });

  if (!parsed.success) {
    return { error: "Champs invalides." };
  }

  const created = await db.stockItem.create({ data: parsed.data });
  await logAudit({
    userId: admin.id,
    action: "stock.create",
    entity: "StockItem",
    entityId: created.id,
    after: created,
  });
  revalidatePath("/stock");
}

export async function updateStockItem(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = StockItemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    quantity: formData.get("quantity"),
    minThreshold: formData.get("minThreshold"),
    costPrice: formData.get("costPrice") ?? 0,
    allergens: formData.get("allergens") || undefined,
    barcode: formData.get("barcode") || undefined,
  });

  if (!parsed.success) {
    return { error: "Champs invalides." };
  }

  const before = await db.stockItem.findUnique({ where: { id: itemId } });
  const updated = await db.stockItem.update({ where: { id: itemId }, data: parsed.data });
  await logAudit({
    userId: admin.id,
    action: "stock.update",
    entity: "StockItem",
    entityId: itemId,
    before,
    after: updated,
  });
  revalidatePath("/stock");
}

export async function deleteStockItem(itemId: string) {
  const admin = await requireAdmin();
  // Suppression réversible : on masque l'article, l'historique des mouvements reste.
  const before = await db.stockItem.findUnique({ where: { id: itemId } });
  await db.stockItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
  await logAudit({
    userId: admin.id,
    action: "stock.delete",
    entity: "StockItem",
    entityId: itemId,
    before,
  });
  revalidatePath("/stock");
  revalidatePath("/");
}

const MovementSchema = z.object({
  type: z.enum(StockMovementType),
  quantity: z.coerce.number(),
  unitCost: z.coerce.number().min(0).optional(),
  note: z.string().trim().optional(),
});

export async function recordStockMovement(
  stockItemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = MovementSchema.safeParse({
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    unitCost: formData.get("unitCost") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: "Quantité invalide." };
  }

  const { type, quantity, unitCost, note } = parsed.data;
  const createExpense = formData.get("createExpense") === "on";

  if (quantity < 0) {
    return { error: "La quantité ne peut pas être négative." };
  }
  // IN/OUT d'une quantité nulle n'a pas de sens ; ADJUSTMENT à 0 est valide (mise à zéro).
  if (type !== "ADJUSTMENT" && quantity === 0) {
    return { error: "Quantité invalide." };
  }

  try {
    await db.$transaction(async (tx) => {
      const item = await tx.stockItem.findUnique({
        where: { id: stockItemId },
        select: { name: true, quantity: true, unit: true, costPrice: true, deletedAt: true },
      });
      if (!item || item.deletedAt) {
        throw new MovementError("Article introuvable.");
      }

      // OUT : refuser une sortie qui ferait passer le stock sous zéro.
      if (type === "OUT" && item.quantity.lt(quantity)) {
        throw new MovementError(
          `Stock insuffisant : ${formatQuantity(item.quantity)} ${item.unit} disponible(s).`
        );
      }

      // ADJUSTMENT fixe une valeur absolue (correction d'inventaire) ; IN/OUT ajustent.
      const data: Record<string, unknown> =
        type === "ADJUSTMENT"
          ? { quantity }
          : { quantity: { increment: type === "OUT" ? -quantity : quantity } };

      // Entrée avec coût unitaire : recalcul du PMP (prix moyen pondéré).
      if (type === "IN" && unitCost !== undefined && unitCost > 0) {
        const currentQty = item.quantity;
        const currentValue = currentQty.times(item.costPrice);
        const inValue = new Prisma.Decimal(unitCost).times(quantity);
        const newQty = currentQty.plus(quantity);
        if (newQty.gt(0)) {
          data.costPrice = currentValue.plus(inValue).div(newQty).toDecimalPlaces(2);
        }
      }

      // Achat (IN) : proposer d'enregistrer la dépense correspondante et la lier.
      let ledgerEntryId: string | undefined;
      if (type === "IN" && createExpense && unitCost !== undefined && unitCost > 0) {
        const entry = await tx.ledgerEntry.create({
          data: {
            date: toDateOnly(new Date()),
            type: "EXPENSE",
            amount: new Prisma.Decimal(unitCost).times(quantity).toDecimalPlaces(2),
            category: "Achats stock",
            note: `${item.name} × ${formatQuantity(quantity)} ${item.unit}`,
            createdById: admin.id,
          },
        });
        ledgerEntryId = entry.id;
      }

      await tx.stockItem.update({ where: { id: stockItemId }, data });
      await tx.stockMovement.create({
        data: { stockItemId, type, quantity, unitCost, note, createdById: admin.id, ledgerEntryId },
      });
    });
  } catch (e) {
    if (e instanceof MovementError) {
      return { error: e.message };
    }
    throw e;
  }

  await logAudit({
    userId: admin.id,
    action: `stock.movement.${type.toLowerCase()}`,
    entity: "StockItem",
    entityId: stockItemId,
    after: { type, quantity, unitCost, note },
  });
  revalidatePath("/stock");
  revalidatePath("/comptabilite");
  revalidatePath("/");
}
