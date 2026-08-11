import { getCurrentUser } from "@stock-kan-kan/auth/dal";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="planning-shell flex flex-1 flex-col bg-surface">
      <Nav name={user.name} isAdmin={user.role === "ADMIN"} />
      <main className="has-tabbar mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
        {children}
      </main>
    </div>
  );
}
