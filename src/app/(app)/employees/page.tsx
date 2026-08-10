import { Suspense } from "react";
import { requireAdmin } from "@stock-kan-kan/auth/dal";
import { db } from "@stock-kan-kan/db";
import { EmployeesView, type UserVM } from "@/components/employees-view";
import { ListSkeleton } from "@stock-kan-kan/ui/skeleton";

export default function EmployeesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Équipe</h1>
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <EmployeesContent />
      </Suspense>
    </div>
  );
}

async function EmployeesContent() {
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
    <>
      <p className="num text-sm text-muted">{users.length} compte(s)</p>
      <EmployeesView users={users} currentUserId={currentUser.id} />
    </>
  );
}
