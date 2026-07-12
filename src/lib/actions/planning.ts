"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/dal";
import { TimeEntryType } from "@/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/stock";

const ShiftSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().optional(),
});

export async function createShift(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = ShiftSchema.safeParse({
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: "Champs invalides." };
  }

  await db.shift.create({
    data: {
      employeeId: parsed.data.employeeId,
      date: new Date(parsed.data.date),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      note: parsed.data.note,
    },
  });

  revalidatePath("/planning");
}

export async function deleteShift(shiftId: string) {
  await requireAdmin();
  await db.shift.delete({ where: { id: shiftId } });
  revalidatePath("/planning");
}

export async function clockAction(type: "CLOCK_IN" | "CLOCK_OUT") {
  const user = await getCurrentUser();

  const last = await db.timeEntry.findFirst({
    where: { employeeId: user.id },
    orderBy: { timestamp: "desc" },
  });

  const expected: TimeEntryType = last?.type === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN";
  if (type !== expected) {
    return { error: `Action invalide : vous devez d'abord ${expected === "CLOCK_IN" ? "pointer l'arrivée" : "pointer le départ"}.` };
  }

  await db.timeEntry.create({
    data: { employeeId: user.id, type },
  });

  revalidatePath("/pointage");
}
