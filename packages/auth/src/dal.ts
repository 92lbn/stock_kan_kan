import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { decryptSession, getSessionToken, deleteSession } from "@stock-kan-kan/auth/session";
import { db } from "@stock-kan-kan/db";

// Une seule requête base par rendu, mise en cache par React `cache`. Elle relit le
// rôle et la version de session pour révoquer un JWT encore valide après un
// changement de rôle/mot de passe, une suppression, ou une mise à jour côté serveur.
// Toutes les gardes (verifySession, getCurrentUser, requireAdmin) dérivent d'ici :
// pas de vague de requêtes séquentielle supplémentaire.
const getVerifiedUser = cache(async () => {
  const token = await getSessionToken();
  const session = await decryptSession(token);

  if (!session?.userId) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      identifier: true,
      name: true,
      role: true,
      canStock: true,
      sessionVersion: true,
      deletedAt: true,
    },
  });

  // Compte supprimé, introuvable, ou token périmé (version incrémentée) → session révoquée.
  if (!user || user.deletedAt || user.sessionVersion !== session.sessionVersion) {
    await deleteSession();
    redirect("/login");
  }

  return user;
});

export const verifySession = cache(async () => {
  const user = await getVerifiedUser();
  return { userId: user.id, role: user.role };
});

export const getCurrentUser = cache(async () => {
  const user = await getVerifiedUser();
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    role: user.role,
    canStock: user.canStock,
  };
});

// Contrôle admin, basé sur le rôle RELU en base (pas sur le rôle figé dans le JWT).
export async function requireAdmin() {
  const user = await getVerifiedUser();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return { id: user.id, role: user.role };
}

// Variante qui lève au lieu de rediriger (server actions), avec la même
// revalidation en base. Renvoie l'utilisateur vérifié.
export async function requireSession() {
  const user = await getVerifiedUser();
  return { userId: user.id, role: user.role };
}

export async function requireStockAccess() {
  const user = await getVerifiedUser();
  if (user.role !== "ADMIN" && !user.canStock) {
    redirect("/acces-refuse");
  }
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    canStock: user.canStock,
  };
}

// Pour les route handlers (exports…) : renvoie l'utilisateur vérifié ou null,
// sans rediriger — le handler décide du code HTTP (403).
export async function getApiUser() {
  const token = await getSessionToken();
  const session = await decryptSession(token);
  if (!session?.userId) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, canStock: true, sessionVersion: true, deletedAt: true },
  });
  if (!user || user.deletedAt || user.sessionVersion !== session.sessionVersion) return null;
  return { id: user.id, role: user.role, canStock: user.canStock };
}
