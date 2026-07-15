import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { NoteForm } from "@/components/note-form";
import { NoteItem } from "@/components/note-item";
import { PushToggle } from "@/components/push-toggle";

export default async function NotesPage() {
  const user = await getCurrentUser();

  const notes = await db.note.findMany({
    where: { authorId: user.id },
    orderBy: [{ done: "asc" }, { remindAt: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Mes notes</h1>

      <Card>
        <h2 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Active les notifications pour recevoir un rappel sur ton téléphone à l&apos;heure prévue,
          même l&apos;application fermée.
        </p>
        <PushToggle />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Nouvelle note</h2>
        <NoteForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Mes notes</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune note pour le moment.</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
