"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@stock-kan-kan/db";
import { createSession, deleteSession } from "@stock-kan-kan/auth/session";

const LoginSchema = z.object({
  identifier: z.string().trim().min(1, { error: "Identifiant requis." }).toLowerCase(),
  password: z.string().min(1, { error: "Mot de passe requis." }),
});

// Rate limiting : verrouillage après trop d'échecs récents pour un même identifiant.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_FAILS = 5;
const RATE_MAX_IP_FAILS = 20;
const RATE_MAX_GLOBAL_FAILS = 100;
const DUMMY_PASSWORD_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

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
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";

  // Verrouillage temporaire si trop d'échecs récents pour cet identifiant.
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const [recentFails, ipFails, globalFails] = await Promise.all([
    db.loginAttempt.count({ where: { identifier, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { ip, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { createdAt: { gte: since } } }),
  ]);
  if (recentFails >= RATE_MAX_FAILS || ipFails >= RATE_MAX_IP_FAILS || globalFails >= RATE_MAX_GLOBAL_FAILS) {
    return {
      error: "Trop de tentatives. Réessayez dans une quinzaine de minutes.",
    };
  }

  const user = await db.user.findUnique({ where: { identifier } });
  const passwordMatches = await bcrypt.compare(
    password,
    user && !user.deletedAt ? user.passwordHash : DUMMY_PASSWORD_HASH
  );

  if (!user || user.deletedAt || !passwordMatches) {
    await db.loginAttempt.create({ data: { identifier, ip } });
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  // Succès : on purge les échecs de cet identifiant.
  await db.loginAttempt.deleteMany({ where: { identifier } });
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: since } } });
  await createSession(user.id, user.role, user.sessionVersion);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
