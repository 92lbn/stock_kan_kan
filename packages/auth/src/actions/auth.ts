"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@stock-kan-kan/db";
import { createSession, deleteSession } from "@stock-kan-kan/auth/session";

const LoginSchema = z.object({
  identifier: z.string().trim().min(1, { error: "Identifiant requis." }).toLowerCase(),
  password: z.string().min(1, { error: "Mot de passe requis." }),
});

// Rate limiting : verrouillage après trop d'échecs récents pour un même identifiant.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_FAILS = 5;

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

  // Verrouillage temporaire si trop d'échecs récents pour cet identifiant.
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recentFails = await db.loginAttempt.count({
    where: { identifier, createdAt: { gte: since } },
  });
  if (recentFails >= RATE_MAX_FAILS) {
    return {
      error: "Trop de tentatives. Réessayez dans une quinzaine de minutes.",
    };
  }

  const user = await db.user.findUnique({ where: { identifier } });
  const passwordMatches =
    user && !user.deletedAt && (await bcrypt.compare(password, user.passwordHash));

  if (!user || user.deletedAt || !passwordMatches) {
    await db.loginAttempt.create({ data: { identifier } });
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  // Succès : on purge les échecs de cet identifiant.
  await db.loginAttempt.deleteMany({ where: { identifier } });
  await createSession(user.id, user.role, user.sessionVersion);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
