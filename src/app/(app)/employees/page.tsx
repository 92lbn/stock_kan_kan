import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { EmployeesView, type UserVM } from "@/components/employees-view";

export default async function EmployeesPage() {
  const currentUser = await requireAdmin();

  const rawUsers = await db.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const users: UserVM[] = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    identifier: u.identifier,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    hourlyRate: u.hourlyRate.toNumber(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-ink">Équipe</h1>
        <span className="num text-sm text-muted">{users.length} compte(s)</span>
      </div>
      <EmployeesView users={users} currentUserId={currentUser.id} />
    </div>
  );
}
