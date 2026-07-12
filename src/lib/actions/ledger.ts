"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { LedgerEntryType } from "@/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/stock";

const LedgerEntrySchema = z.object({
  date: z.string().min(1),
  type: z.enum(LedgerEntryType),
  amount: z.coerce.number().positive({ error: "Le montant doit être positif." }),
  category: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function createLedgerEntry(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = LedgerEntrySchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: "Champs invalides." };
  }

  await db.ledgerEntry.create({
    data: {
      date: new Date(parsed.data.date),
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      note: parsed.data.note,
      createdById: admin.id,
    },
  });

  revalidatePath("/comptabilite");
  revalidatePath("/");
}

export async function deleteLedgerEntry(entryId: string) {
  await requireAdmin();
  await db.ledgerEntry.delete({ where: { id: entryId } });
  revalidatePath("/comptabilite");
  revalidatePath("/");
}
