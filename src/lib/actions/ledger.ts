"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { requireAdmin } from "@stock-kan-kan/auth/dal";
import { parseDateInput, toDateOnly } from "@stock-kan-kan/lib/date";
import { logAudit } from "@stock-kan-kan/lib/audit";
import { LedgerEntryType } from "@stock-kan-kan/db/enums";
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

  const created = await db.ledgerEntry.create({
    data: {
      date: parseDateInput(parsed.data.date),
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      note: parsed.data.note,
      createdById: admin.id,
    },
  });
  await logAudit({
    userId: admin.id,
    action: "ledger.create",
    entity: "LedgerEntry",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/comptabilite");
  revalidatePath("/");
}

export async function deleteLedgerEntry(entryId: string) {
  const admin = await requireAdmin();
  // Suppression réversible (soft delete).
  const before = await db.ledgerEntry.findUnique({ where: { id: entryId } });
  await db.ledgerEntry.update({ where: { id: entryId }, data: { deletedAt: new Date() } });
  await logAudit({
    userId: admin.id,
    action: "ledger.delete",
    entity: "LedgerEntry",
    entityId: entryId,
    before,
  });
  revalidatePath("/comptabilite");
  revalidatePath("/");
}

// Records a payroll total (for a given month) as a single EXPENSE entry.
export async function recordPayrollAsExpense(amount: number, label: string) {
  const admin = await requireAdmin();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Montant de paye invalide." };
  }

  await db.ledgerEntry.create({
    data: {
      date: toDateOnly(new Date()),
      type: "EXPENSE",
      amount,
      category: "Salaires",
      note: label,
      createdById: admin.id,
    },
  });

  revalidatePath("/comptabilite");
  revalidatePath("/");
  return undefined;
}
