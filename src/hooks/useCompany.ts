"use client";

import { useCompanyStore } from "@/store/companyStore";
import { useEffect } from "react";

export function useCompany() {
  const { activeCompany, financialYear, companies, setCompanies, setActiveCompany } =
    useCompanyStore();

  useEffect(() => {
    if (companies.length === 0) {
      fetch("/api/companies")
        .then((r) => r.json())
        .then((data: { companies?: unknown[] }) => {
          if (data.companies && Array.isArray(data.companies)) {
            setCompanies(data.companies as Parameters<typeof setCompanies>[0]);
            if (!activeCompany && data.companies.length > 0) {
              setActiveCompany(data.companies[0] as Parameters<typeof setActiveCompany>[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, [companies.length, activeCompany, setCompanies, setActiveCompany]);

  return { activeCompany, financialYear, companies, setActiveCompany };
}
