"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { StockCategory, StockMovementType } from "@/generated/prisma/enums";

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
  await requireAdmin();

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

  await db.stockItem.create({ data: parsed.data });
  revalidatePath("/stock");
}

export async function updateStockItem(
  itemId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

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

  await db.stockItem.update({ where: { id: itemId }, data: parsed.data });
  revalidatePath("/stock");
}

export async function deleteStockItem(itemId: string) {
  await requireAdmin();
  await db.stockItem.delete({ where: { id: itemId } });
  revalidatePath("/stock");
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

  if (!parsed.success || parsed.data.quantity <= 0) {
    return { error: "Quantité invalide." };
  }

  const { type, quantity, note } = parsed.data;
  const delta = type === "OUT" ? -quantity : quantity;

  await db.$transaction([
    db.stockItem.update({
      where: { id: stockItemId },
      data: { quantity: { increment: delta } },
    }),
    db.stockMovement.create({
      data: {
        stockItemId,
        type,
        quantity,
        note,
        createdById: admin.id,
      },
    }),
  ]);

  revalidatePath("/stock");
}
