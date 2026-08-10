import { Suspense } from "react";
import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { Card } from "@stock-kan-kan/ui/card";
import { ListSkeleton } from "@stock-kan-kan/ui/skeleton";
import { NoteForm } from "@/components/note-form";
import { NoteItem } from "@/components/note-item";
import { PushToggle } from "@/components/push-toggle";

// Shell instantané : titre, notifications et formulaire (aucune donnée). Seule la
// liste des notes est en <Suspense>.
export default function NotesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Mes notes</h1>

      <Card>
        <h2 className="mb-1 font-semibold text-ink">Notifications</h2>
        <p className="mb-3 text-xs text-muted">
          Active les notifications pour recevoir un rappel sur ton téléphone à l&apos;heure prévue,
          même l&apos;application fermée.
        </p>
        <PushToggle />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Nouvelle note</h2>
        <NoteForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Mes notes</h2>
        <Suspense fallback={<ListSkeleton rows={4} />}>
          <NotesList />
        </Suspense>
      </Card>
    </div>
  );
}

async function NotesList() {
  const user = await requireStockAccess();

  const notes = await db.note.findMany({
    where: { authorId: user.id },
    orderBy: [{ done: "asc" }, { remindAt: "asc" }, { createdAt: "desc" }],
  });

  // « Rappel dû » calculé côté serveur (pas de Date.now() impur pendant le rendu client).
  const now = new Date().getTime();

  if (notes.length === 0) {
    return <p className="text-sm text-muted">Aucune note pour le moment.</p>;
  }

  return (
    <ul>
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          isDue={!!(note.remindAt && note.remindAt.getTime() <= now && !note.done)}
        />
      ))}
    </ul>
  );
}
