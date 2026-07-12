"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  identifier: z.string().trim().min(1, { error: "Identifiant requis." }),
  password: z.string().min(1, { error: "Mot de passe requis." }),
});

export type LoginState =
  | { error: string }
  | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Identifiant et mot de passe requis." };
  }

  const { identifier, password } = parsed.data;

  const user = await db.user.findUnique({ where: { identifier } });
  if (!user) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  await createSession(user.id, user.role);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
