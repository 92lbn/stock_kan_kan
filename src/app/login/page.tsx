"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-ink">
          Gestion Restaurant
        </h1>
        <p className="mb-6 text-sm text-muted">
          Connectez-vous avec votre identifiant.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="identifier">Identifiant</Label>
            <Input id="identifier" name="identifier" autoComplete="username" required />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state?.error && (
            <p className="text-sm text-accent">{state.error}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
