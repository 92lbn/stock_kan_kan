"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/stock";

const CreateUserSchema = z.object({
  identifier: z.string().trim().min(1),
  name: z.string().trim().min(1),
  password: z.string().min(4, { error: "8 caractères minimum recommandés." }),
  role: z.enum(Role),
});

export async function createUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = CreateUserSchema.safeParse({
    identifier: formData.get("identifier"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: "Champs invalides (mot de passe : 4 caractères minimum)." };
  }

  const existing = await db.user.findUnique({
    where: { identifier: parsed.data.identifier },
  });
  if (existing) {
    return { error: "Cet identifiant est déjà utilisé." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.user.create({
    data: {
      identifier: parsed.data.identifier,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
    },
  });

  revalidatePath("/employees");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    // Self-deletion is not offered in the UI; guard against direct action calls.
    return;
  }
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/employees");
}
