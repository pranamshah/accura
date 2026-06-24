"use client";

import { useEffect } from "react";
import { useCompanyStore } from "@/store/companyStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Providers } from "@/app/providers";
import type { Company } from "@/types";

function CompanyLoader() {
  const { activeCompany, setActiveCompany, setCompanies } = useCompanyStore();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/companies");
        if (!res.ok) return;
        const data = await res.json() as { companies: Company[] };
        setCompanies(data.companies);
        if (!activeCompany && data.companies.length > 0) {
          setActiveCompany(data.companies[0]);
        }
      } catch {
        // silently fail — user might not be authenticated yet
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
