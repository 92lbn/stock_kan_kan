"use client";

import { useActionState } from "react";
import { login } from "@stock-kan-kan/auth/actions";
import { Button } from "@stock-kan-kan/ui/button";
import { Card } from "@stock-kan-kan/ui/card";
import { Icon } from "@stock-kan-kan/ui/icons";
import { Input, Label } from "@stock-kan-kan/ui/input";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="planning-login relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-surface px-4 py-8 sm:px-6">
      <div className="planning-login-orbit planning-login-orbit-left" aria-hidden="true" />
      <div className="planning-login-orbit planning-login-orbit-right" aria-hidden="true" />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-card shadow-xl md:grid-cols-[1.05fr_0.95fr]">
        <section className="planning-login-intro hidden min-h-[34rem] flex-col justify-between p-10 md:flex">
          <div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-accent-ink">k·k</span>
            <p className="mt-6 text-sm font-semibold tracking-[0.12em] text-accent uppercase">kan·kan planning</p>
            <h1 className="mt-3 max-w-sm text-4xl font-semibold leading-tight tracking-tight text-ink">Votre service, vos horaires, vos heures.</h1>
            <p className="mt-4 max-w-sm leading-7 text-muted">Un espace simple pour savoir quand vous travaillez et retrouver les heures enregistrées.</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-card/70 p-4">
            <Icon name="clock" className="mt-0.5 flex-none text-accent" width={20} height={20} />
            <p className="text-sm leading-6 text-muted">Les arrivées et départs se pointent uniquement avec votre PIN sur la tablette du restaurant.</p>
          </div>
        </section>

        <section className="flex items-center p-5 sm:p-8 md:p-10">
          <div className="w-full">
            <div className="mb-7 md:hidden">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-ink">k·k</span>
              <p className="mt-4 eyebrow">kan·kan planning</p>
            </div>
            <h2 className="text-2xl font-semibold text-ink">Bon retour parmi nous</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Connectez-vous pour consulter votre planning.</p>

            <form action={formAction} className="mt-7 space-y-5">
              <div>
                <Label htmlFor="identifier">Identifiant</Label>
                <Input id="identifier" name="identifier" autoComplete="username" autoFocus required />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>

              {state?.error && (
                <Card role="alert" className="border-danger/30 bg-danger/5 p-3 text-sm text-danger">{state.error}</Card>
              )}

              <Button type="submit" disabled={pending} className="min-h-12 w-full">
                {pending ? "Connexion en cours…" : "Se connecter"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-muted">Un problème de connexion ? Adressez-vous à votre responsable.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
