"use client";

import { useActionState, useRef, useEffect } from "react";
import { createRecipe } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const categories = [
  { value: "MENU", label: "Menu / Carte" },
  { value: "BOISSON", label: "Boisson" },
  { value: "MARINADE", label: "Marinade" },
];

export function RecipeForm({ defaultCategory }: { defaultCategory?: string }) {
  const [state, formAction, pending] = useActionState(createRecipe, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    // Reset the form after a successful submission (pending went true -> false, no error).
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Titre</Label>
          <Input id="title" name="title" placeholder="Ex : Bissap, Marinade poulet..." required />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="category">Catégorie</Label>
          <Select id="category" name="category" defaultValue={defaultCategory ?? "MENU"}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="ingredients">Ingrédients (une ligne par ingrédient)</Label>
        <Textarea id="ingredients" name="ingredients" rows={4} />
      </div>
      <div>
        <Label htmlFor="steps">Préparation (une étape par ligne)</Label>
        <Textarea id="steps" name="steps" rows={5} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Ajouter la fiche"}
      </Button>
    </form>
  );
}
