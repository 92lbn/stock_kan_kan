import { requireStockAccess } from "@stock-kan-kan/auth/dal";
import { Nav } from "@/components/nav";
import { OfflineBanner } from "@/components/offline-banner";
import { ServiceWorkerRegister } from "@/components/service-worker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStockAccess();

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <ServiceWorkerRegister />
      <OfflineBanner />
      <Nav name={user.name} />
      <main className="has-tabbar mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
