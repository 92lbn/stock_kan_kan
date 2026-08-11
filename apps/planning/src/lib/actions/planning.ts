"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { requireAdmin, getCurrentUser } from "@stock-kan-kan/auth/dal";
import { addDays, parseDateInput, toYmd } from "@stock-kan-kan/lib/date";
import { datedShiftsOverlap } from "@stock-kan-kan/lib/hours";
import { DateInputSchema, IdSchema, TimeInputSchema } from "@stock-kan-kan/lib/schemas";
import { performAuthenticatedClock } from "@stock-kan-kan/auth/kiosk";
import type { ActionState } from "@stock-kan-kan/lib/action";

const ShiftSchema = z.object({
  employeeId: IdSchema,
  date: DateInputSchema,
  startTime: TimeInputSchema,
  endTime: TimeInputSchema,
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
  const nearby = await db.shift.findMany({
    where: { employeeId: parsed.data.employeeId, date: { gte: addDays(date, -1), lte: addDays(date, 1) } },
    select: { date: true, startTime: true, endTime: true },
  });
  const candidate = { date: parsed.data.date, startTime: parsed.data.startTime, endTime: parsed.data.endTime };
  if (nearby.some((s) => datedShiftsOverlap({ ...s, date: toYmd(s.date) }, candidate))) {
    return { error: "Ce créneau en chevauche un autre, y compris un service de nuit adjacent." };
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
  employeeId: IdSchema,
  startDate: DateInputSchema,
  endDate: DateInputSchema,
  startTime: TimeInputSchema,
  endTime: TimeInputSchema,
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

  const candidates = dates.map((date) => ({ date: toYmd(date), startTime, endTime }));
  const existing = await db.shift.findMany({
    where: { employeeId, date: { gte: addDays(start, -1), lte: addDays(end, 1) } },
    select: { date: true, startTime: true, endTime: true },
  });
  const normalizedExisting = existing.map((shift) => ({ ...shift, date: toYmd(shift.date) }));
  if (candidates.some((candidate) => normalizedExisting.some((shift) => datedShiftsOverlap(shift, candidate)))) {
    return { error: "Au moins un créneau chevauche un service existant, y compris de nuit." };
  }
  if (candidates.some((candidate, index) => candidates.slice(index + 1).some((other) => datedShiftsOverlap(candidate, other)))) {
    return { error: "Les créneaux du lot se chevauchent entre eux." };
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
  const parsed = z.enum(["CLOCK_IN", "CLOCK_OUT"]).safeParse(type);
  if (!parsed.success) return { error: "Action de pointage invalide." };
  const error = await performAuthenticatedClock({ employeeId: user.id, type: parsed.data });
  if (error) return { error };

  revalidatePath("/pointage");
  revalidatePath("/");
  return undefined;
}
