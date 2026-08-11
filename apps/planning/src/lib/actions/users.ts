"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@stock-kan-kan/db";
import { requireAdmin } from "@stock-kan-kan/auth/dal";
import { auditData, logAudit } from "@stock-kan-kan/lib/audit";
import { IdSchema, PinInputSchema } from "@stock-kan-kan/lib/schemas";
import { Role } from "@stock-kan-kan/db/enums";
import type { ActionState } from "@stock-kan-kan/lib/action";

const CreateUserSchema = z.object({
  identifier: z.string().trim().min(1).toLowerCase(),
  name: z.string().trim().min(1),
  password: z.string().min(8, { error: "8 caractères minimum." }),
  role: z.enum(Role),
  hourlyRate: z.coerce.number().min(0).default(0),
  canStock: z.literal("on").optional().transform(Boolean),
  pin: PinInputSchema.optional(),
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
    canStock: formData.get("canStock") || undefined,
    pin: formData.get("pin") || undefined,
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

  const pinHash = parsed.data.pin ? await bcrypt.hash(parsed.data.pin, 10) : null;
  await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        identifier: parsed.data.identifier,
        name: parsed.data.name,
        role: parsed.data.role,
        hourlyRate: parsed.data.hourlyRate,
        canStock: parsed.data.canStock,
        passwordHash,
        pinHash,
      },
    });
    await tx.auditLog.create({
      data: auditData({
        userId: admin.id,
        action: "user.create",
        entity: "User",
        entityId: created.id,
        after: {
          identifier: created.identifier,
          name: created.name,
          role: created.role,
          hasPin: Boolean(created.pinHash),
        },
      }),
    });
  });

  revalidatePath("/employees");
}

const UpdatePinSchema = z.object({
  userId: IdSchema,
  pin: z.union([PinInputSchema, z.literal("")]),
});

export async function updateUserPin(
  userId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = UpdatePinSchema.safeParse({ userId, pin: formData.get("pin") });
  if (!parsed.success) return { error: "Le PIN doit contenir 4 à 6 chiffres." };

  const target = await db.user.findFirst({
    where: { id: parsed.data.userId, role: "EMPLOYEE", deletedAt: null },
    select: { id: true, pinHash: true },
  });
  if (!target) return { error: "Employé introuvable." };

  const pinHash = parsed.data.pin ? await bcrypt.hash(parsed.data.pin, 10) : null;
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { pinHash } });
    await tx.loginAttempt.deleteMany({ where: { identifier: `kiosk:${target.id}` } });
    await tx.auditLog.create({
      data: auditData({
        userId: admin.id,
        action: pinHash ? "user.setPin" : "user.removePin",
        entity: "User",
        entityId: target.id,
        before: { hasPin: Boolean(target.pinHash) },
        after: { hasPin: Boolean(pinHash) },
      }),
    });
  });
  revalidatePath("/employees");
  return undefined;
}

const StockAccessSchema = z.object({
  canStock: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function updateStockAccess(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = StockAccessSchema.safeParse({ canStock: formData.get("canStock") });
  if (!parsed.success) return;
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, deletedAt: true, canStock: true },
  });
  if (!target || target.deletedAt || target.role === "ADMIN") return;
  await db.user.update({ where: { id: target.id }, data: { canStock: parsed.data.canStock } });
  await logAudit({
    userId: admin.id,
    action: "user.updateStockAccess",
    entity: "User",
    entityId: target.id,
    before: { canStock: target.canStock },
    after: { canStock: parsed.data.canStock },
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

  // Un compte superadmin ne peut voir son mot de passe changé que par lui-même :
  // un admin ordinaire ne doit pas pouvoir prendre le contrôle du compte protégé.
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    return { error: "Compte introuvable." };
  }
  if (target.isSuperAdmin && admin.id !== userId) {
    return { error: "Le mot de passe d'un superadmin ne peut être changé que par lui-même." };
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
