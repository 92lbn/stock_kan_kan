"use client";

import { useActionState, useRef, useEffect } from "react";
import { createIdea, deleteIdea } from "@/lib/actions/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/confirm-action";

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
      {state?.error && <p className="mt-1 text-sm text-accent">{state.error}</p>}

      {ideas.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucune idée pour le moment.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="flex items-start justify-between gap-3 rounded-md bg-card px-3 py-2 text-sm"
            >
              <span className="text-ink">{idea.text}</span>
              <ConfirmAction
                action={deleteIdea.bind(null, idea.id)}
                title="Supprimer cette idée ?"
                message="L'idée sera définitivement supprimée."
                triggerLabel="Retirer"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
