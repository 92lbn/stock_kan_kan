import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui/card";
import { UserForm } from "@/components/user-form";
import { Button } from "@/components/ui/button";
import { deleteUser } from "@/lib/actions/users";

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <th className="pb-2 font-medium">Nom</th>
              <th className="pb-2 font-medium">Identifiant</th>
              <th className="pb-2 font-medium">Rôle</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{u.name}</td>
                <td className="py-2 text-zinc-500">{u.identifier}</td>
                <td className="py-2">
                  <Badge variant={u.role === "ADMIN" ? "success" : "default"}>
                    {u.role === "ADMIN" ? "Responsable" : "Employé"}
                  </Badge>
                </td>
                <td className="py-2 text-right">
                  {u.id !== currentUser.id && (
                    <form action={deleteUser.bind(null, u.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Supprimer
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
