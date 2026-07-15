"use client";

import { useActionState, useRef, useEffect } from "react";
import { createScheduledPost } from "@/lib/actions/social";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export function PostForm() {
  const [state, formAction, pending] = useActionState(createScheduledPost, undefined);
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
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="platform">Réseau</Label>
          <Select id="platform" name="platform" defaultValue="INSTAGRAM">
            <option value="TIKTOK">TikTok</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="SNAPCHAT">Snapchat</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="scheduledAt">Date &amp; heure</Label>
          <Input id="scheduledAt" name="scheduledAt" type="datetime-local" />
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <Select id="status" name="status" defaultValue="SCHEDULED">
            <option value="IDEA">Idée</option>
            <option value="READY">Prêt</option>
            <option value="SCHEDULED">Planifié</option>
            <option value="PUBLISHED">Publié</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="caption">Légende / description</Label>
        <Textarea id="caption" name="caption" rows={2} placeholder="Texte du post, hashtags..." />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "..." : "Planifier"}
      </Button>
    </form>
  );
}
