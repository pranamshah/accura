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

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      activeCompany: null,
      financialYear: defaultFY,
      companies: [],
      setActiveCompany: (company) => {
        const fy = getFinancialYear(new Date(), company.financialYearStart);
        set({ activeCompany: company, financialYear: fy });
      },
      setCompanies: (companies) => set({ companies }),
      setFinancialYear: (fy) => set({ financialYear: fy }),
      clearCompany: () => set({ activeCompany: null }),
    }),
    {
      name: "accura-company",
      partialize: (state) => ({
        activeCompany: state.activeCompany,
        financialYear: state.financialYear,
      }),
    }
  )
);
