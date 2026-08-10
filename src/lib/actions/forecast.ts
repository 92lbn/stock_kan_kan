"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { requireAdmin } from "@stock-kan-kan/auth/dal";
import { parseDateInput } from "@stock-kan-kan/lib/date";

const ForecastSchema = z.object({
  expectedRevenue: z.coerce.number().min(0),
});

// Définit (ou met à jour) le CA prévisionnel d'un jour. `date` = "YYYY-MM-DD".
export async function setDailyForecast(date: string, formData: FormData) {
  await requireAdmin();
  const parsed = ForecastSchema.safeParse({ expectedRevenue: formData.get("expectedRevenue") });
  if (!parsed.success) return;

  const day = parseDateInput(date);
  await db.dailyForecast.upsert({
    where: { date: day },
    create: { date: day, expectedRevenue: parsed.data.expectedRevenue },
    update: { expectedRevenue: parsed.data.expectedRevenue },
  });
  revalidatePath("/comptabilite");
}
