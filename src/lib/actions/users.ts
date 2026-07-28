"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/stock";

const CreateUserSchema = z.object({
  identifier: z.string().trim().min(1).toLowerCase(),
  name: z.string().trim().min(1),
  password: z.string().min(8, { error: "8 caractères minimum." }),
  role: z.enum(Role),
  hourlyRate: z.coerce.number().min(0).default(0),
});

export async function createUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = CreateUserSchema.safeParse({
    identifier: formData.get("identifier"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
    hourlyRate: formData.get("hourlyRate") || 0,
  });

  if (!parsed.success) {
    return { error: "Champs invalides (mot de passe : 8 caractères minimum)." };
  }

  const existing = await db.user.findUnique({
    where: { identifier: parsed.data.identifier },
  });
  if (existing) {
    return { error: "Cet identifiant est déjà utilisé." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const created = await db.user.create({
    data: {
      identifier: parsed.data.identifier,
      name: parsed.data.name,
      role: parsed.data.role,
      hourlyRate: parsed.data.hourlyRate,
      passwordHash,
    },
  });
  await logAudit({
    userId: admin.id,
    action: "user.create",
    entity: "User",
    entityId: created.id,
    after: { identifier: created.identifier, name: created.name, role: created.role },
  });

  revalidatePath("/employees");
}

const HourlyRateSchema = z.object({
  hourlyRate: z.coerce.number().min(0),
});

export async function updateHourlyRate(
  userId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = HourlyRateSchema.safeParse({
    hourlyRate: formData.get("hourlyRate"),
  });

  if (!parsed.success) {
    return { error: "Taux invalide." };
  }

  await db.user.update({
    where: { id: userId },
    data: { hourlyRate: parsed.data.hourlyRate },
  });
  await logAudit({
    userId: admin.id,
    action: "user.updateHourlyRate",
    entity: "User",
    entityId: userId,
    after: { hourlyRate: parsed.data.hourlyRate },
  });

  revalidatePath("/employees");
  revalidatePath("/comptabilite");
  return undefined;
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    // Self-deletion is not offered in the UI; guard against direct action calls.
    return;
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.isSuperAdmin || target.deletedAt) {
    // The superadmin account can never be deleted, by anyone.
    return;
  }

  // Suppression réversible + révocation des sessions encore valides du compte.
  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), sessionVersion: { increment: 1 } },
  });
  await logAudit({
    userId: admin.id,
    action: "user.delete",
    entity: "User",
    entityId: userId,
    before: { identifier: target.identifier, name: target.name, role: target.role },
  });
  revalidatePath("/employees");
}

const ChangePasswordSchema = z.object({
  password: z.string().min(8, { error: "8 caractères minimum." }),
});

export async function changeUserPassword(
  userId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = ChangePasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Mot de passe trop court (8 caractères minimum)." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  // Changer le mot de passe révoque les JWT existants de ce compte.
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  await logAudit({
    userId: admin.id,
    action: "user.changePassword",
    entity: "User",
    entityId: userId,
  });

  revalidatePath("/employees");
  return undefined;
}
