"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { formatQuantity } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { StockCategory, StockMovementType } from "@/generated/prisma/enums";

// Erreur métier propagée hors de la transaction interactive pour un retour typé.
class MovementError extends Error {}

const StockItemSchema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(StockCategory),
  unit: z.string().trim().min(1),
  quantity: z.coerce.number().min(0),
  minThreshold: z.coerce.number().min(0),
});

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
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: "Quantité invalide." };
  }

  const { type, quantity, note } = parsed.data;

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
        select: { quantity: true, unit: true, deletedAt: true },
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
      const data =
        type === "ADJUSTMENT"
          ? { quantity }
          : { quantity: { increment: type === "OUT" ? -quantity : quantity } };

      await tx.stockItem.update({ where: { id: stockItemId }, data });
      await tx.stockMovement.create({
        data: { stockItemId, type, quantity, note, createdById: admin.id },
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
    after: { type, quantity, note },
  });
  revalidatePath("/stock");
  revalidatePath("/");
}
