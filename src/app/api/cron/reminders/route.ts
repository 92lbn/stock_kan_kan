import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

// Triggered by Vercel Cron (see vercel.json). Also callable manually with the
// correct Bearer token. Sends push notifications for due note reminders and
// low-stock alerts.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  let reminderCount = 0;
  let stockAlertCount = 0;

  // 1. Note reminders that are due and not yet notified.
  const dueNotes = await db.note.findMany({
    where: {
      remindAt: { lte: now },
      notifiedAt: null,
      done: false,
    },
  });

  for (const note of dueNotes) {
    await sendPushToUser(note.authorId, {
      title: "Rappel",
      body: note.content.slice(0, 120),
      url: "/notes",
      tag: `note-${note.id}`,
    });
    await db.note.update({ where: { id: note.id }, data: { notifiedAt: now } });
    reminderCount++;
  }

  // 2. Low-stock alerts sent to all admins (once per run).
  const stockItems = await db.stockItem.findMany();
  const lowStock = stockItems.filter((item) => item.quantity <= item.minThreshold);

  if (lowStock.length > 0) {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const names = lowStock.slice(0, 5).map((i) => i.name).join(", ");
    const extra = lowStock.length > 5 ? ` +${lowStock.length - 5} autres` : "";
    for (const admin of admins) {
      await sendPushToUser(admin.id, {
        title: `${lowStock.length} article(s) à réapprovisionner`,
        body: `${names}${extra}`,
        url: "/stock",
        tag: "low-stock",
      });
      stockAlertCount++;
    }
  }

  return Response.json({ ok: true, reminderCount, stockAlertCount });
}
