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
  const { openGoTo, toggleCalculator, toggleDateModal, togglePeriodModal, setCompanies, setActiveCompany, activeCompany,
          showGoTo, showCalculator, showDateModal, showPeriodModal, showCompanyModal, closeGoTo, toggleCompanyModal } = useTallyStore();

  const { data } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies');
      if (!res.ok) return { companies: [] };
      return res.json() as Promise<{ companies: Company[] }>;
    },
  });

  useEffect(() => {
    // Run schema migrations once per session (idempotent — safe to call repeatedly).
    if (typeof window !== 'undefined' && !sessionStorage.getItem('accura-init-done')) {
      fetch('/api/init').then(() => sessionStorage.setItem('accura-init-done', '1')).catch(() => {});
    }
  }, []);

  // Enter key → move focus to the next field inside any .tally-form (Tally-style navigation)
  useEffect(() => {
    function onEnter(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (!['input', 'select'].includes(tag)) return;
      // Don't intercept Enter when a modifier is held (allow ⌘Enter, Ctrl+Enter)
      if (e.altKey || e.metaKey) return;

      const form = target.closest('.tally-form, [data-enter-nav]');
      if (!form) return;

      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
      ).filter((el) => el.offsetParent !== null && !el.hidden);

      const idx = focusable.indexOf(target);
      if (idx >= 0 && idx < focusable.length - 1) {
        e.preventDefault();
        focusable[idx + 1].focus();
        // Auto-select text in the next input so typing replaces it
        if (focusable[idx + 1].tagName.toLowerCase() === 'input') {
          (focusable[idx + 1] as HTMLInputElement).select();
        }
      }
    }
    window.addEventListener('keydown', onEnter);
    return () => window.removeEventListener('keydown', onEnter);
  }, []);

  useEffect(() => {
    if (data?.companies) {
      const cos = data.companies;
      setCompanies(cos);
      if (!activeCompany && cos.length > 0) setActiveCompany(cos[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useKeyboardShortcuts({
    // Navigation
    'alt+g': () => openGoTo(),
    'ctrl+g': () => openGoTo(),           // ⌘G or Ctrl+G
    'ctrl+f': () => openGoTo(),           // ⌘F SmartFind → GoTo for now
    // Date / Period
    'f2': () => toggleDateModal(),
    'alt+f2': () => togglePeriodModal(),
    'ctrl+shift+d': () => togglePeriodModal(), // ⌘⇧D Change Period
    // Company
    'f3': () => router.push('/gateway'),
    'ctrl+q': () => router.push('/gateway'), // ⌘Q / Ctrl+Q
    'ctrl+w': () => router.push('/gateway'), // ⌘W Quit screen
    // Calculator: ⌘⇧C or Ctrl+N (keep both)
    'ctrl+n': () => toggleCalculator(),
    'ctrl+shift+c': () => toggleCalculator(), // ⌘⇧C
    // Voucher type shortcuts
    'f4': () => router.push('/vouchers/contra'),
    'f5': () => router.push('/vouchers/payment'),
    'f6': () => router.push('/vouchers/receipt'),
    'f7': () => router.push('/vouchers/journal'),
    'f8': () => router.push('/vouchers/sales'),
    'f9': () => router.push('/vouchers/purchase'),
    'ctrl+shift+5': () => router.push('/vouchers/debit-note'),   // ⌘⇧5
    'ctrl+shift+6': () => router.push('/vouchers/credit-note'),  // ⌘⇧6
    // AI
    'alt+i': () => router.push('/ai/smart-entry'),
    'alt+q': () => router.push('/ai/ask'),
    'alt+m': () => router.push('/utilities/share-with-ca'),
    // Escape
    'escape': () => {
      if (showGoTo) { closeGoTo(); return; }
      if (showCalculator) { toggleCalculator(); return; }
      if (showDateModal) { toggleDateModal(); return; }
      if (showPeriodModal) { togglePeriodModal(); return; }
      if (showCompanyModal) { toggleCompanyModal(); return; }
      router.back();
    },
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
