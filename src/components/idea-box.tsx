"use client";

import { useActionState, useRef, useEffect } from "react";
import { createIdea, deleteIdea } from "@/lib/actions/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Idea = { id: string; text: string };

export function IdeaBox({ ideas }: { ideas: Idea[] }) {
  const [state, formAction, pending] = useActionState(createIdea, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <Input name="text" placeholder="Nouvelle idée de vidéo..." required />
        <Button type="submit" disabled={pending}>
          {pending ? "..." : "Ajouter"}
        </Button>
      </form>
      {state?.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}

      {ideas.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Aucune idée pour le moment.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="flex items-start justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
            >
              <span className="text-zinc-700 dark:text-zinc-300">{idea.text}</span>
              <form action={deleteIdea.bind(null, idea.id)}>
                <button
                  type="submit"
                  className="text-xs text-zinc-400 hover:text-red-600"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
