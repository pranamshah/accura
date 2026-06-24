"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompanyStore } from "@/store/companyStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Providers } from "@/app/providers";
import type { Company } from "@/types";

function CompanyLoader() {
  const { setActiveCompany, setCompanies } = useCompanyStore();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/companies");
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (!res.ok) return;
        const data = await res.json() as { companies: Company[] };
        if (data.companies.length === 0) return;
        setCompanies(data.companies);
        const currentId = useCompanyStore.getState().activeCompany?.id;
        const refreshed = currentId
          ? (data.companies.find((c) => c.id === currentId) ?? data.companies[0])
          : data.companies[0];
        setActiveCompany(refreshed);
      } catch {
        // network error — stay on page
      }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <CompanyLoader />
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
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
