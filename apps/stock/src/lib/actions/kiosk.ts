"use server";

import * as z from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import { performKioskClock } from "@stock-kan-kan/auth/kiosk";
import { IdSchema, PinInputSchema } from "@stock-kan-kan/lib/schemas";
import type { ActionState } from "@stock-kan-kan/lib/action";

const KioskClockSchema = z.object({
  employeeId: IdSchema,
  pin: PinInputSchema,
  type: z.enum(["CLOCK_IN", "CLOCK_OUT"]),
});

export async function kioskClockAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const station = await requireStockAccess();
  const parsed = KioskClockSchema.safeParse({
    employeeId: formData.get("employeeId"),
    pin: formData.get("pin"),
    type: formData.get("type"),
  });
  if (!parsed.success) return { error: "Employé, action ou PIN invalide." };

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  const error = await performKioskClock({
    ...parsed.data,
    ip,
    stationUserId: station.id,
  });
  if (error) return { error };

  revalidatePath("/pointage");
  revalidatePath("/");
  return undefined;
}
