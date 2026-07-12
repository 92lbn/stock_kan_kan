"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-5">
      <div className="sm:col-span-1">
        <Label htmlFor="identifier">Identifiant</Label>
        <Input id="identifier" name="identifier" required />
      </div>
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
      <div className="sm:col-span-1 flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Création..." : "Créer le compte"}
        </Button>
      </div>

      {state?.error && (
        <p className="sm:col-span-5 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
