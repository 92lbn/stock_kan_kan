"use client";

import { useActionState, useState } from "react";
import { updateRecipe, deleteRecipe } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const categories = [
  { value: "MENU", label: "Menu / Carte" },
  { value: "BOISSON", label: "Boisson" },
  { value: "MARINADE", label: "Marinade" },
];

type Recipe = {
  id: string;
  title: string;
  category: string;
  ingredients: string;
  steps: string;
};

function TextBlock({ label, content }: { label: string; content: string }) {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-zinc-400">{label}</p>
      <ul className="list-inside list-disc space-y-0.5 text-sm text-zinc-700 dark:text-zinc-300">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function RecipeCard({ recipe, canEdit }: { recipe: Recipe; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const boundUpdate = updateRecipe.bind(null, recipe.id);
  const [state, formAction, pending] = useActionState(boundUpdate, undefined);

  if (editing) {
    return (
      <Card>
        <form
          action={async (fd) => {
            await formAction(fd);
            setEditing(false);
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor={`title-${recipe.id}`}>Titre</Label>
              <Input id={`title-${recipe.id}`} name="title" defaultValue={recipe.title} required />
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor={`cat-${recipe.id}`}>Catégorie</Label>
              <Select id={`cat-${recipe.id}`} name="category" defaultValue={recipe.category}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor={`ing-${recipe.id}`}>Ingrédients</Label>
            <Textarea id={`ing-${recipe.id}`} name="ingredients" rows={4} defaultValue={recipe.ingredients} />
          </div>
          <div>
            <Label htmlFor={`steps-${recipe.id}`}>Préparation</Label>
            <Textarea id={`steps-${recipe.id}`} name="steps" rows={5} defaultValue={recipe.steps} />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "..." : "Enregistrer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{recipe.title}</h3>
        {canEdit && (
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <form
              action={deleteRecipe.bind(null, recipe.id)}
              onSubmit={(e) => {
                if (!confirm("Supprimer cette fiche ?")) e.preventDefault();
              }}
            >
              <Button type="submit" size="sm" variant="ghost">
                Supprimer
              </Button>
            </form>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <TextBlock label="Ingrédients" content={recipe.ingredients} />
        <TextBlock label="Préparation" content={recipe.steps} />
      </div>
    </Card>
  );
}
