'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import TopMenuBar from '@/components/tally/TopMenuBar';
import RightButtonBar from '@/components/tally/RightButtonBar';
import BottomBar from '@/components/tally/BottomBar';
import GoToModal from '@/components/tally/GoToModal';
import CalculatorPanel from '@/components/tally/CalculatorPanel';
import DateModal from '@/components/tally/DateModal';
import { useQuery } from '@tanstack/react-query';
import type { Company } from '@/types';

export default function TallyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { openGoTo, toggleCalculator, toggleDateModal, togglePeriodModal, setCompanies, setActiveCompany, activeCompany } = useTallyStore();

  const { data } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies');
      if (!res.ok) return { companies: [] };
      return res.json() as Promise<{ companies: Company[] }>;
    },
  });

  useEffect(() => {
    if (data?.companies) {
      const cos = data.companies;
      setCompanies(cos);
      if (!activeCompany && cos.length > 0) setActiveCompany(cos[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useKeyboardShortcuts({
    'alt+g': () => openGoTo(),
    'ctrl+g': () => openGoTo(),
    'ctrl+n': () => toggleCalculator(),
    'f2': () => toggleDateModal(),
    'alt+f2': () => togglePeriodModal(),
    'f3': () => router.push('/gateway'),
    'f4': () => router.push('/vouchers/contra'),
    'f5': () => router.push('/vouchers/payment'),
    'f6': () => router.push('/vouchers/receipt'),
    'f7': () => router.push('/vouchers/journal'),
    'f8': () => router.push('/vouchers/sales'),
    'f9': () => router.push('/vouchers/purchase'),
    'ctrl+q': () => router.push('/gateway'),
    'alt+i': () => router.push('/ai/smart-entry'),
    'alt+q': () => router.push('/ai/ask'),
    'alt+m': () => router.push('/utilities/share-with-ca'),
  });

  return (
    <div className="tally-shell">
      <div className="accura-header">
        <div className="accura-header-wordmark">ACC<span>URA</span></div>
        <div className="accura-header-company">{activeCompany?.name ?? 'No Company Selected'}</div>
      </div>
      <TopMenuBar />
      <div className="tally-main">
        <div className="tally-content">{children}</div>
        <RightButtonBar />
      </div>
      <BottomBar />
      <GoToModal />
      <CalculatorPanel />
      <DateModal />
    </div>
  );
}
