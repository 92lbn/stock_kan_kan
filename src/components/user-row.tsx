"use client";

import { useActionState, useState } from "react";
import { changeUserPassword, deleteUser, updateHourlyRate } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";

type UserRowData = {
  id: string;
  name: string;
  identifier: string;
  role: string;
  isSuperAdmin: boolean;
  hourlyRate: number;
};

export function UserRow({ user, isCurrentUser }: { user: UserRowData; isCurrentUser: boolean }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const boundChangePassword = changeUserPassword.bind(null, user.id);
  const [state, formAction, pending] = useActionState(boundChangePassword, undefined);

  const boundRate = updateHourlyRate.bind(null, user.id);
  const [rateState, rateAction, ratePending] = useActionState(boundRate, undefined);

  return (
    <tr className="border-b border-zinc-100 align-top dark:border-zinc-800">
      <td className="py-2 text-zinc-700 dark:text-zinc-300">
        {user.name}
        {user.isSuperAdmin && (
          <Badge variant="warning" className="ml-2">
            Superadmin
          </Badge>
        )}
      </td>
      <td className="py-2 text-zinc-500">{user.identifier}</td>
      <td className="py-2">
        <Badge variant={user.role === "ADMIN" ? "success" : "default"}>
          {user.role === "ADMIN" ? "Responsable" : "Employé"}
        </Badge>
      </td>
      <td className="py-2">
        <form action={rateAction} className="flex items-center gap-1">
          <Input
            name="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={user.hourlyRate}
            className="h-8 w-20 text-xs"
          />
          <span className="text-xs text-zinc-400">€/h</span>
          <Button type="submit" size="sm" variant="ghost" disabled={ratePending}>
            {ratePending ? "..." : "OK"}
          </Button>
        </form>
        {rateState?.error && <p className="mt-1 text-xs text-red-600">{rateState.error}</p>}
      </td>
      <td className="py-2">
        {showPasswordForm ? (
          <form action={formAction} className="flex items-center gap-2">
            <Input
              name="password"
              type="password"
              placeholder="Nouveau mot de passe"
              required
              className="h-8 w-40 text-xs"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={pending}>
              OK
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowPasswordForm(false)}>
              Annuler
            </Button>
          </form>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowPasswordForm(true)}>
            Changer le mot de passe
          </Button>
        )}
        {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      </td>
      <td className="py-2 text-right">
        {!user.isSuperAdmin && !isCurrentUser && (
          <form action={deleteUser.bind(null, user.id)}>
            <Button type="submit" size="sm" variant="ghost">
              Supprimer
            </Button>
          </form>
        )}
      </td>
    </tr>
  );
}
