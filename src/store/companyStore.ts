"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Company } from "@/types";
import { getFinancialYear } from "@/lib/utils";

interface CompanyState {
  activeCompany: Company | null;
  financialYear: { start: Date; end: Date; label: string };
  companies: Company[];
  setActiveCompany: (company: Company) => void;
  setCompanies: (companies: Company[]) => void;
  setFinancialYear: (fy: { start: Date; end: Date; label: string }) => void;
  clearCompany: () => void;
}

const defaultFY = getFinancialYear();

// Handle both camelCase (financialYearStart) and snake_case (financial_year_start)
// in case old persist data is still in localStorage
function getFYStart(company: Company): number {
  return (
    (company as unknown as Record<string, unknown>).financialYearStart as number ??
    (company as unknown as Record<string, unknown>).financial_year_start as number ??
    4
  );
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      activeCompany: null,
      financialYear: defaultFY,
      companies: [],
      setActiveCompany: (company) => {
        const fyStart = getFYStart(company);
        const fy = getFinancialYear(new Date(), fyStart);
        set({ activeCompany: company, financialYear: fy });
      },
      setCompanies: (companies) => set({ companies }),
      setFinancialYear: (fy) => set({ financialYear: fy }),
      clearCompany: () => set({ activeCompany: null, companies: [] }),
    }),
    {
      name: "accura-company-v2", // v2 = bump clears any stale v1 snake_case data
      partialize: (state) => ({
        activeCompany: state.activeCompany,
        financialYear: state.financialYear,
        companies: state.companies,
      }),
    }
  )
);
