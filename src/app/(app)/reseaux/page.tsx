import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IdeaBox } from "@/components/idea-box";
import { SocialCalendar } from "@/components/social-calendar";
import { PostsList, type PostVM } from "@/components/posts-list";
import type { CalendarEvent } from "@/components/month-calendar";

const pad = (n: number) => String(n).padStart(2, "0");

const platformColors: Record<string, string> = {
  TIKTOK: "#000000",
  INSTAGRAM: "#d62976",
  SNAPCHAT: "#f7c800",
};

const platformLabels: Record<string, string> = {
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  SNAPCHAT: "Snapchat",
};

const statusLabels: Record<string, string> = {
  IDEA: "Idée",
  READY: "Prêt",
  SCHEDULED: "Planifié",
  PUBLISHED: "Publié",
};

export default async function ReseauxPage() {
  await requireAdmin();

  const [ideas, posts] = await Promise.all([
    db.contentIdea.findMany({ orderBy: { createdAt: "desc" } }),
    db.scheduledPost.findMany({ orderBy: { scheduledAt: "asc" } }),
  ]);

  const now = new Date();
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const scheduled = posts.filter((p) => p.scheduledAt);
  const events: CalendarEvent[] = scheduled.map((post) => ({
    id: post.id,
    title: `${platformLabels[post.platform]}${post.caption ? " – " + post.caption.slice(0, 30) : ""}`,
    date: post.scheduledAt!.toISOString().slice(0, 10),
    color: platformColors[post.platform],
  }));

  const postsVM: PostVM[] = posts.map((post) => ({
    id: post.id,
    platformLabel: platformLabels[post.platform],
    color: platformColors[post.platform],
    dateLabel: post.scheduledAt
      ? post.scheduledAt.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    status: post.status,
    statusLabel: statusLabels[post.status],
    caption: post.caption ?? "",
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Réseaux sociaux</h1>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Boîte à idées</h2>
        <IdeaBox ideas={ideas} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Calendrier éditorial</h2>
        <SocialCalendar events={events} month={month} />
      </Card>

      <PostsList posts={postsVM} />
    </div>
  );
}
