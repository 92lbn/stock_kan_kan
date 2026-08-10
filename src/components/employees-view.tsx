"use client";

import { useActionState, useState } from "react";
import { changeUserPassword, deleteUser, updateHourlyRate } from "@/lib/actions/users";
import { Button } from "@stock-kan-kan/ui/button";
import { Input, Label } from "@stock-kan-kan/ui/input";
import { Badge } from "@stock-kan-kan/ui/card";
import { Sheet } from "@stock-kan-kan/ui/sheet";
import { ConfirmAction } from "@stock-kan-kan/ui/confirm-action";
import { UserForm } from "@/components/user-form";

export type UserVM = {
  id: string;
  name: string;
  identifier: string;
  role: string;
  isSuperAdmin: boolean;
  hourlyRate: number;
};

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function EmployeesView({
  users,
  currentUserId,
}: {
  users: UserVM[];
  currentUserId: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const openUser = users.find((u) => u.id === openId) ?? null;

  return (
    <div>
      <ul className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
        {users.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => setOpenId(u.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card-2"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent/12 text-sm font-semibold text-accent">
                {u.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">{u.name}</span>
                  {u.isSuperAdmin && <Badge variant="warning">Superadmin</Badge>}
                </span>
                <span className="text-xs text-muted">
                  {u.identifier} · {u.role === "ADMIN" ? "Responsable" : "Employé"}
                </span>
              </span>
              <span className="num text-sm text-muted">{eur.format(u.hourlyRate)}/h</span>
              <span className="text-faint" aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Ajouter un compte"
        className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl text-accent-ink shadow-lg transition-transform active:scale-95 sm:bottom-8"
      >
        +
      </button>

      <Sheet open={!!openUser} onClose={() => setOpenId(null)} title={openUser?.name}>
        {openUser && (
          <UserActions user={openUser} isCurrentUser={openUser.id === currentUserId} />
        )}
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Nouveau compte">
        <div className="pb-2">
          <UserForm onDone={() => setAddOpen(false)} />
        </div>
      </Sheet>
    </div>
  );
}

function UserActions({ user, isCurrentUser }: { user: UserVM; isCurrentUser: boolean }) {
  const [rateState, rateAction, ratePending] = useActionState(
    updateHourlyRate.bind(null, user.id),
    undefined
  );
  const [pwState, pwAction, pwPending] = useActionState(
    changeUserPassword.bind(null, user.id),
    undefined
  );

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center gap-2">
        <Badge variant={user.role === "ADMIN" ? "success" : "default"}>
          {user.role === "ADMIN" ? "Responsable" : "Employé"}
        </Badge>
        <span className="text-sm text-muted">{user.identifier}</span>
      </div>

      <form action={rateAction} className="space-y-1">
        <Label htmlFor={`rate-${user.id}`}>Taux horaire (€/h)</Label>
        <div className="flex gap-2">
          <Input
            id={`rate-${user.id}`}
            name="hourlyRate"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={user.hourlyRate}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={ratePending}>
            {ratePending ? "…" : "Enregistrer"}
          </Button>
        </div>
        {rateState?.error && <p className="text-sm text-danger">{rateState.error}</p>}
      </form>

      <form action={pwAction} className="space-y-1">
        <Label htmlFor={`pw-${user.id}`}>Nouveau mot de passe</Label>
        <div className="flex gap-2">
          <Input
            id={`pw-${user.id}`}
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères min."
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={pwPending}>
            {pwPending ? "…" : "Changer"}
          </Button>
        </div>
        {pwState?.error && <p className="text-sm text-danger">{pwState.error}</p>}
      </form>

      {!user.isSuperAdmin && !isCurrentUser && (
        <div className="border-t border-line pt-3">
          <ConfirmAction
            action={deleteUser.bind(null, user.id)}
            title="Supprimer ce compte ?"
            message={`« ${user.name} » sera désactivé et ses sessions révoquées (réversible).`}
            triggerLabel="Supprimer le compte"
          />
        </div>
      )}
    </div>
  );
}
