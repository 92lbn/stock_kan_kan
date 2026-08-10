import { db } from "@stock-kan-kan/db";
import { sendPushToUser } from "@/lib/push";
import { Prisma } from "@stock-kan-kan/db/client";

export const dynamic = "force-dynamic";
// web-push nécessite le runtime Node (crypto natif).
export const runtime = "nodejs";

// Triggered by Vercel Cron (see vercel.json). Also callable manually with the
// correct Bearer token. Sends push notifications for due note reminders and
// low-stock alerts.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Endpoint fermé par défaut : sans secret configuré, on refuse (500) plutôt que
  // de laisser l'endpoint ouvert à tous.
  if (!secret) {
    console.error("CRON_SECRET manquant : endpoint /api/cron/reminders désactivé.");
    return new Response("Server misconfiguration", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const staleClaim = new Date(now.getTime() - 10 * 60 * 1000);
  let reminderCount = 0;
  let stockAlertCount = 0;

  // 1. Note reminders that are due and not yet notified.
  const dueNotes = await db.note.findMany({
    where: {
      remindAt: { lte: now },
      notifiedAt: null,
      OR: [{ notificationClaimedAt: null }, { notificationClaimedAt: { lt: staleClaim } }],
      done: false,
    },
  });

  for (const note of dueNotes) {
    const claim = await db.note.updateMany({
      where: { id: note.id, notifiedAt: null, OR: [{ notificationClaimedAt: null }, { notificationClaimedAt: { lt: staleClaim } }] },
      data: { notificationClaimedAt: now, notificationAttempts: { increment: 1 } },
    });
    if (claim.count !== 1) continue;
    const result = await sendPushToUser(note.authorId, {
      title: "Rappel",
      body: note.content.slice(0, 120),
      url: "/notes",
      tag: `note-${note.id}`,
    });
    if (result.sent > 0) {
      await db.note.update({ where: { id: note.id }, data: { notifiedAt: now, notificationClaimedAt: null, lastNotificationError: null } });
      reminderCount++;
    } else {
      await db.note.update({ where: { id: note.id }, data: { notificationClaimedAt: null, lastNotificationError: result.configured ? "Aucun appareil livré." : "Web Push non configuré." } });
    }
  }

  // 2. Low-stock alerts sent to all admins (once per run).
  const stockItems = await db.stockItem.findMany({ where: { deletedAt: null }, include: { lots: { where: { quantity: { gt: 0 } } } } });
  const lowStock = stockItems.filter((item) => {
    const quantity = item.lots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
    return item.minThreshold.gt(0) && quantity.lte(item.minThreshold);
  });

  if (lowStock.length > 0) {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", deletedAt: null },
      select: { id: true },
    });
    const names = lowStock.slice(0, 5).map((i) => i.name).join(", ");
    const extra = lowStock.length > 5 ? ` +${lowStock.length - 5} autres` : "";
    for (const admin of admins) {
      const result = await sendPushToUser(admin.id, {
        title: `${lowStock.length} article(s) à réapprovisionner`,
        body: `${names}${extra}`,
        url: "/stock",
        tag: "low-stock",
      });
      if (result.sent > 0) stockAlertCount++;
    }
  }

  return Response.json({ ok: true, reminderCount, stockAlertCount });
}
