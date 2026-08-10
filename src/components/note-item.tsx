"use client";

import { useOptimistic, useTransition } from "react";
import { toggleNoteDone, deleteNote } from "@/lib/actions/notes";
import { Button } from "@stock-kan-kan/ui/button";
import { Badge } from "@stock-kan-kan/ui/card";
import { cn } from "@stock-kan-kan/lib/utils";

type Note = {
  id: string;
  content: string;
  remindAt: Date | null;
  done: boolean;
};

export function NoteItem({ note, isDue }: { note: Note; isDue: boolean }) {
  const [isPending, startTransition] = useTransition();
  // La case se coche instantanément, avant le round-trip serveur.
  const [optimisticDone, setOptimisticDone] = useOptimistic(note.done);

  const remindLabel = note.remindAt
    ? note.remindAt.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <li className="flex items-start justify-between gap-3 border-b border-line py-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={optimisticDone}
          disabled={isPending}
          onChange={() =>
            startTransition(async () => {
              setOptimisticDone(!optimisticDone);
              await toggleNoteDone(note.id);
            })
          }
          className="mt-1 accent-accent"
        />
        <div>
          <p
            className={cn(
              "text-sm text-ink",
              optimisticDone && "text-muted line-through dark:text-muted"
            )}
          >
            {note.content}
          </p>
          {remindLabel && (
            <Badge variant={isDue ? "danger" : "default"} className="mt-1">
              {isDue ? "Rappel dû" : "Rappel"} : {remindLabel}
            </Badge>
          )}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => startTransition(() => deleteNote(note.id))}
      >
        Supprimer
      </Button>
    </li>
  );
}
