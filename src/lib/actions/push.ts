"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { sendPushToUser } from "@/lib/push";

type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(sub: SubscriptionInput) {
  const user = await getCurrentUser();

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Abonnement invalide." };
  }

  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });

  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  await getCurrentUser();
  await db.pushSubscription.deleteMany({ where: { endpoint } });
  return { ok: true };
}

// Sends an immediate test notification to the current user's devices.
export async function sendTestPush() {
  const user = await getCurrentUser();
  await sendPushToUser(user.id, {
    title: "Notifications activées ✓",
    body: "Vous recevrez vos rappels ici.",
    url: "/notes",
    tag: "test",
  });
  return { ok: true };
}
