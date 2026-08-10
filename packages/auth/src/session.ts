import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@stock-kan-kan/db/enums";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  // Un secret trop court affaiblit tous les JWT : on refuse au démarrage.
  if (secret.length < 32 || /change[-_]?me/i.test(secret)) {
    throw new Error("SESSION_SECRET must be a strong random string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: Role;
  // Version embarquée du compte. verifySession() la compare à celle en base pour
  // révoquer un JWT encore valide après un changement de rôle/mot de passe ou une
  // suppression du compte.
  sessionVersion: number;
  expiresAt: number;
};

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as string,
      role: payload.role as Role,
      sessionVersion: (payload.sessionVersion as number) ?? 0,
      expiresAt: (payload.exp ?? 0) * 1000,
    };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, role: Role, sessionVersion: number) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = await encryptSession({ userId, role, sessionVersion, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
