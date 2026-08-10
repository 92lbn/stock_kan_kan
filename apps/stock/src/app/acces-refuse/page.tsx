import { logout } from "@stock-kan-kan/auth/actions";
import { Button } from "@stock-kan-kan/ui/button";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-ink">Accès au stock non autorisé</h1>
        <p className="text-sm text-muted">
          Ton compte n’a pas le droit d’utiliser cette application. Demande l’accès à un administrateur.
        </p>
        <form action={logout}><Button type="submit">Se déconnecter</Button></form>
      </div>
    </main>
  );
}
