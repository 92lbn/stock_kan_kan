"use client";

import { useTransition } from "react";
import { toggleNoteDone, deleteNote } from "@/lib/actions/notes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  content: string;
  remindAt: Date | null;
  done: boolean;
};

export function NoteItem({ note }: { note: Note }) {
  const [isPending, startTransition] = useTransition();

  const remindLabel = note.remindAt
    ? note.remindAt.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const isDue = note.remindAt && note.remindAt.getTime() <= Date.now() && !note.done;

  return (
    <li className="flex items-start justify-between gap-3 border-b border-zinc-100 py-3 dark:border-zinc-800">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={note.done}
          disabled={isPending}
          onChange={() => startTransition(() => toggleNoteDone(note.id))}
          className="mt-1 accent-zinc-900 dark:accent-zinc-100"
        />
        <div>
          <p
            className={cn(
              "text-sm text-zinc-800 dark:text-zinc-200",
              note.done && "text-zinc-400 line-through dark:text-zinc-600"
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
