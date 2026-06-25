'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { formatDate, getFinancialYear, formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from '@/types';

const MASTERS_VOUCHERS = [
  { key: 'D', label: 'Dashboard', path: '/dashboard' },
  { key: 'V', label: 'Vouchers', path: '/vouchers/payment' },
  { key: 'I', label: 'Smart Entry', path: '/ai/smart-entry' },
  { key: 'N', label: 'Invoices', path: '/invoices' },
  { key: 'C', label: 'Create Master', path: '/create/ledger' },
  { key: 'A', label: 'Alter Master', path: '/alter/ledger' },
  { key: 'E', label: 'Employees', path: '/create/employee' },
  { key: 'Q', label: 'Quit', path: '__quit' },
];

const REPORTS_ANALYTICS = [
  { key: 'K', label: 'Day Book', path: '/display/day-book' },
  { key: 'B', label: 'Balance Sheet', path: '/display/balance-sheet' },
  { key: 'P', label: 'Profit & Loss A/c', path: '/display/profit-loss' },
  { key: 'S', label: 'Stock Summary', path: '/display/stock-summary' },
  { key: 'R', label: 'Ratio Analysis', path: '/display/ratio-analysis' },
  { key: 'G', label: 'GST Reports', path: '/display/gst/gstr1' },
  { key: 'X', label: 'Ask Accura', path: '/ai/ask' },
  { key: 'Z', label: 'Anomaly Scanner', path: '/display/anomaly-scanner' },
];

const ALL_ITEMS = [...MASTERS_VOUCHERS, ...REPORTS_ANALYTICS];

export default function GatewayPage() {
  const router = useRouter();
  const { activeCompany, currentDate } = useTallyStore();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { data: dashData } = useQuery<DashboardData>({
    queryKey: ['dashboard', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return null;
      const r = await fetch(`/api/dashboard?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const fy = getFinancialYear(new Date(currentDate), activeCompany?.financialYearStart ?? 4);
  const navigableItems = ALL_ITEMS.filter((m) => m.path !== '__quit');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;
      const key = e.key.toUpperCase();
      const item = ALL_ITEMS.find((m) => m.key === key);
      if (item) { e.preventDefault(); navigate(item); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, navigableItems.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); const nav = navigableItems[selectedIdx]; if (nav) navigate(nav); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx]);

  async function navigate(item: { key: string; label: string; path: string }) {
    if (item.path === '__quit') { router.replace('/gateway'); return; }
    router.push(item.path);
  }

  function MenuItem({ item }: { item: typeof ALL_ITEMS[0] }) {
    const navIdx = navigableItems.indexOf(item);
    const isSelected = navIdx === selectedIdx;
    return (
      <div
        className={`gateway-menu-item${isSelected ? ' selected' : ''}`}
        onClick={() => navigate(item)}
        onMouseEnter={() => navIdx >= 0 && setSelectedIdx(navIdx)}
      >
        <span className="key">{item.key}</span>
        <span className="lbl" style={{ marginLeft: 8 }}>{item.label}</span>
        <span className="dots">{'·'.repeat(16)}</span>
      </div>
    );
  }

  return (
    <div className="gateway">
      {/* Left: two-panel menu */}
      <div className="gateway-left">
        {/* Company info above both panels */}
        <div style={{ width: '100%', marginBottom: 12 }}>
          <div className="gateway-company-info" style={{ display: 'flex', gap: 32 }}>
            <div>Current Company: <span className="value">{activeCompany?.name ?? 'No company selected'}</span></div>
            <div>Financial Year: <span className="value">{fy.label}</span></div>
            <div>Date: <span className="value">{formatDate(new Date(currentDate))}</span></div>
            {activeCompany?.gstin && <div>GSTIN: <span className="value">{activeCompany.gstin}</span></div>}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {/* Panel 1: Masters & Vouchers */}
            <div className="gateway-panel">
              <div className="gateway-menu-title">▸ MASTERS &amp; VOUCHERS</div>
              {MASTERS_VOUCHERS.map((item) => <MenuItem key={item.key} item={item} />)}
            </div>

            {/* Panel 2: Reports & Analytics */}
            <div className="gateway-panel">
              <div className="gateway-menu-title">▸ REPORTS &amp; ANALYTICS</div>
              {REPORTS_ANALYTICS.map((item) => <MenuItem key={item.key} item={item} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Quick Stats */}
      <div className="gateway-right">
        <div style={{ background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', marginBottom: 12 }}>
          <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-cyan)', padding: '3px 8px', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
            QUICK STATS
          </div>
          {[
            { label: 'Cash Balance', value: dashData?.cashBalance ?? 0, color: 'var(--tally-yellow)' },
            { label: 'Bank Balance', value: dashData?.bankBalance ?? 0, color: 'var(--tally-cyan)' },
            { label: 'Receivables', value: dashData?.topReceivables?.reduce((s, r) => s + r.amount, 0) ?? 0, color: 'var(--tally-green)' },
            { label: 'Payables', value: dashData?.topPayables?.reduce((s, p) => s + p.amount, 0) ?? 0, color: 'var(--tally-red)' },
            { label: 'GST Liability', value: dashData?.gstLiability ?? 0, color: 'var(--tally-text-dim)' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', borderBottom: '1px solid var(--tally-border)', fontSize: 12 }}>
              <span style={{ color: 'var(--tally-text-dim)' }}>{stat.label}</span>
              <span style={{ color: stat.color, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{formatCurrency(stat.value)}</span>
            </div>
          ))}
        </div>

        {/* Recent Vouchers */}
        <div style={{ background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)' }}>
          <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-cyan)', padding: '3px 8px', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
            RECENT VOUCHERS
          </div>
          {(dashData?.recentVouchers ?? []).slice(0, 8).map((v) => (
            <div
              key={v.id}
              style={{ padding: '2px 8px', borderBottom: '1px solid var(--tally-border)', fontSize: 11, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => router.push(`/vouchers/${v.type.toLowerCase()}`)}
            >
              <span style={{ color: 'var(--tally-cyan)' }}>{v.type.slice(0, 3)}</span>
              <span style={{ color: 'var(--tally-text-dim)' }}>{v.number}</span>
              <span style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(v.amount)}</span>
            </div>
          ))}
          {(!dashData?.recentVouchers || dashData.recentVouchers.length === 0) && (
            <div style={{ padding: '8px', color: 'var(--tally-text-dim)', fontSize: 11, textAlign: 'center' }}>No vouchers yet</div>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: 'var(--tally-text-dim)', lineHeight: 1.8 }}>
          <div style={{ color: 'var(--tally-cyan)', marginBottom: 4 }}>KEYBOARD SHORTCUTS</div>
          <div>Alt+G : Go To any screen</div>
          <div>F2 : Change Date</div>
          <div>F4–F9 : Voucher types</div>
          <div>Ctrl+N : Calculator</div>
        </div>
      </div>
    </div>
  );
}
