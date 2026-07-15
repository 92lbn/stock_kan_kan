"use client";

import { useActionState, useRef, useEffect } from "react";
import { createNote } from "@/lib/actions/notes";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function NoteForm() {
  const [state, formAction, pending] = useActionState(createNote, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="content">Note</Label>
        <Textarea id="content" name="content" rows={3} placeholder="Ex : commander des barquettes demain matin" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="remindAt">Me le rappeler le (optionnel)</Label>
          <Input id="remindAt" name="remindAt" type="datetime-local" />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Ajout..." : "Ajouter la note"}
          </Button>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
