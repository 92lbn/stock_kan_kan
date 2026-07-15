import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { decryptSession, getSessionToken } from "@/lib/session";
import { db } from "@/lib/db";

export const verifySession = cache(async () => {
  const token = await getSessionToken();
  const session = await decryptSession(token);

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, identifier: true, name: true, role: true },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
});

// Session-based admin check: reads the signed session (no DB round-trip) so
// admin pages and actions stay fast. The role in the JWT is trusted because
// the token is signed with SESSION_SECRET.
export async function requireAdmin() {
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    redirect("/");
  }
  return { id: session.userId, role: session.role };
}

// Optimistic check for use outside of request-scoped React cache (e.g. in Server Actions
// where we still want a hard redirect-free failure rather than a page redirect).
export async function requireSession() {
  const token = await getSessionToken();
  const session = await decryptSession(token);
  if (!session?.userId) {
    throw new Error("Unauthorized");
  }
  return session;
}
