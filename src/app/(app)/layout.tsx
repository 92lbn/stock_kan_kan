import { getCurrentUser } from "@/lib/dal";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <Nav role={user.role} name={user.name} />
      {/* pb-24 sur mobile pour ne pas masquer le contenu derrière la barre du bas */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:py-8">{children}</main>
    </div>
  );
}
