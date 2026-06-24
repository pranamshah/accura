import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Providers } from "@/app/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-[240px]">
          <TopBar />
          <main className="flex-1 overflow-y-auto pb-8 px-0">
            {children}
          </main>
          <StatusBar />
        </div>
      </div>
    </Providers>
  );
}
