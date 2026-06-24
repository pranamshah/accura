'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Company, RightButton } from '@/types';

interface TallyStore {
  activeCompany: Company | null;
  companies: Company[];
  currentDate: Date;
  fromDate: Date;
  toDate: Date;
  currentScreen: string;
  rightBarButtons: RightButton[];
  showCalculator: boolean;
  showGoTo: boolean;
  showDateModal: boolean;
  showPeriodModal: boolean;
  showCompanyModal: boolean;
  goToQuery: string;

  setActiveCompany: (c: Company | null) => void;
  setCompanies: (cs: Company[]) => void;
  setCurrentDate: (d: Date) => void;
  setPeriod: (from: Date, to: Date) => void;
  setCurrentScreen: (s: string) => void;
  setRightBarButtons: (btns: RightButton[]) => void;
  toggleCalculator: () => void;
  openGoTo: () => void;
  closeGoTo: () => void;
  setGoToQuery: (q: string) => void;
  toggleDateModal: () => void;
  togglePeriodModal: () => void;
  toggleCompanyModal: () => void;
}

export const useTallyStore = create<TallyStore>()(
  persist(
    (set) => ({
      activeCompany: null,
      companies: [],
      currentDate: new Date(),
      fromDate: new Date(new Date().getFullYear(), 3, 1),
      toDate: new Date(new Date().getFullYear() + 1, 2, 31),
      currentScreen: 'gateway',
      rightBarButtons: [],
      showCalculator: false,
      showGoTo: false,
      showDateModal: false,
      showPeriodModal: false,
      showCompanyModal: false,
      goToQuery: '',
      setActiveCompany: (c) => set({ activeCompany: c }),
      setCompanies: (cs) => set({ companies: cs }),
      setCurrentDate: (d) => set({ currentDate: d }),
      setPeriod: (from, to) => set({ fromDate: from, toDate: to }),
      setCurrentScreen: (s) => set({ currentScreen: s }),
      setRightBarButtons: (btns) => set({ rightBarButtons: btns }),
      toggleCalculator: () => set((s) => ({ showCalculator: !s.showCalculator })),
      openGoTo: () => set({ showGoTo: true, goToQuery: '' }),
      closeGoTo: () => set({ showGoTo: false }),
      setGoToQuery: (q) => set({ goToQuery: q }),
      toggleDateModal: () => set((s) => ({ showDateModal: !s.showDateModal })),
      togglePeriodModal: () => set((s) => ({ showPeriodModal: !s.showPeriodModal })),
      toggleCompanyModal: () => set((s) => ({ showCompanyModal: !s.showCompanyModal })),
    }),
    {
      name: 'accura-tally-v2',
      partialize: (s) => ({
        activeCompany: s.activeCompany,
        companies: s.companies,
        currentDate: s.currentDate,
        fromDate: s.fromDate,
        toDate: s.toDate,
      }),
    }
  )
);
