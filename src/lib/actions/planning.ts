"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { requireAdmin, getCurrentUser } from "@stock-kan-kan/auth/dal";
import { parseDateInput } from "@stock-kan-kan/lib/date";
import { shiftsOverlap } from "@stock-kan-kan/lib/hours";
import { TimeEntryType } from "@stock-kan-kan/db/enums";
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

  const date = parseDateInput(parsed.data.date);

  // Refus des créneaux qui se chevauchent pour le même employé ce jour-là.
  const sameDay = await db.shift.findMany({
    where: { employeeId: parsed.data.employeeId, date },
    select: { startTime: true, endTime: true },
  });
  const candidate = { startTime: parsed.data.startTime, endTime: parsed.data.endTime };
  if (sameDay.some((s) => shiftsOverlap(s, candidate))) {
    return { error: "Ce créneau en chevauche un autre pour cet employé ce jour-là." };
  }

  await db.shift.create({
    data: {
      employeeId: parsed.data.employeeId,
      date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      note: parsed.data.note,
    },
  });

  revalidatePath("/planning");
}

const BulkShiftSchema = z.object({
  employeeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  // Selected weekdays, 0 = Sunday ... 6 = Saturday
  weekdays: z.array(z.coerce.number().min(0).max(6)).min(1),
});

export async function createShiftsBulk(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = BulkShiftSchema.safeParse({
    employeeId: formData.get("employeeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    weekdays: formData.getAll("weekdays"),
  });

  if (!parsed.success) {
    return { error: "Champs invalides (sélectionnez au moins un jour de la semaine)." };
  }

  const { employeeId, startDate, endDate, startTime, endTime, weekdays } = parsed.data;

  // Minuit UTC pour que la colonne @db.Date corresponde au jour saisi (voir date.ts).
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (end < start) {
    return { error: "La date de fin doit être après la date de début." };
  }

  const MAX_DAYS = 366;
  const selectedDays = new Set(weekdays);
  const dates: Date[] = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < MAX_DAYS) {
    if (selectedDays.has(cursor.getUTCDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }

  if (dates.length === 0) {
    return { error: "Aucun jour ne correspond dans cette période." };
  }

  await db.shift.createMany({
    data: dates.map((date) => ({
      employeeId,
      date,
      startTime,
      endTime,
    })),
    // Contrainte @@unique([employeeId, date, startTime]) : ignore les doublons.
    skipDuplicates: true,
  });

  revalidatePath("/planning");
  return undefined;
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
