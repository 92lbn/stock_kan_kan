import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui/card";
import { IdeaBox } from "@/components/idea-box";
import { PostForm } from "@/components/post-form";
import { SocialCalendar } from "@/components/social-calendar";
import { Button } from "@/components/ui/button";
import { deleteScheduledPost } from "@/lib/actions/social";
import type { CalendarEvent } from "@/components/planning-calendar";

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

  const scheduled = posts.filter((p) => p.scheduledAt);
  const events: CalendarEvent[] = scheduled.map((post) => ({
    id: post.id,
    title: `${platformLabels[post.platform]}${post.caption ? " – " + post.caption.slice(0, 30) : ""}`,
    date: post.scheduledAt!.toISOString().slice(0, 10),
    color: platformColors[post.platform],
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Réseaux sociaux
      </h1>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Boîte à idées</h2>
        <IdeaBox ideas={ideas} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Planifier une publication
        </h2>
        <PostForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Calendrier éditorial
        </h2>
        <SocialCalendar events={events} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          Toutes les publications
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune publication planifiée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 font-medium">Réseau</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Statut</th>
                  <th className="pb-2 font-medium">Légende</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-zinc-100 align-top dark:border-zinc-800">
                    <td className="py-2 text-zinc-700 dark:text-zinc-300">
                      {platformLabels[post.platform]}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {post.scheduledAt
                        ? post.scheduledAt.toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-2">
                      <Badge variant={post.status === "PUBLISHED" ? "success" : "default"}>
                        {statusLabels[post.status]}
                      </Badge>
                    </td>
                    <td className="py-2 text-zinc-500">{post.caption ?? "—"}</td>
                    <td className="py-2 text-right">
                      <form action={deleteScheduledPost.bind(null, post.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Supprimer
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
