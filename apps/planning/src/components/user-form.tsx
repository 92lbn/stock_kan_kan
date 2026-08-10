"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "@/lib/actions/users";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label, Select } from "@stock-kan-kan/ui/input";

export function UserForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(createUser, undefined);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone?.();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-1">
        <Label htmlFor="identifier">Identifiant</Label>
        <Input id="identifier" name="identifier" required />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink sm:col-span-2">
        <input name="canStock" type="checkbox" className="h-5 w-5 accent-accent" />
        Autoriser l’accès à l’application Stock
      </label>
      <div className="sm:col-span-1">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="role">Rôle</Label>
        <Select id="role" name="role" defaultValue="EMPLOYEE">
          <option value="EMPLOYEE">Employé</option>
          <option value="ADMIN">Responsable</option>
        </Select>
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="hourlyRate">Taux horaire (€)</Label>
        <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" min="0" defaultValue="0" />
      </div>
      <div className="flex items-end sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Création..." : "Créer le compte"}
        </Button>
      </div>

      {state?.error && (
        <p className="text-sm text-danger sm:col-span-2">{state.error}</p>
      )}
    </form>
  );
}
