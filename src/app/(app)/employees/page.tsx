import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { UserForm } from "@/components/user-form";
import { UserRow } from "@/components/user-row";

export default async function EmployeesPage() {
  const currentUser = await requireAdmin();

  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Employés</h1>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Nouveau compte</h2>
        <UserForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Comptes existants</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <th className="pb-2 font-medium">Nom</th>
              <th className="pb-2 font-medium">Identifiant</th>
              <th className="pb-2 font-medium">Rôle</th>
              <th className="pb-2 font-medium">Taux horaire</th>
              <th className="pb-2 font-medium">Mot de passe</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} isCurrentUser={u.id === currentUser.id} />
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
