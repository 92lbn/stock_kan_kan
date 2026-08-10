import { getCurrentUser } from "@stock-kan-kan/auth/dal";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <Nav name={user.name} isAdmin={user.role === "ADMIN"} />
      <main className="has-tabbar mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
