'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { formatDate, getFinancialYear, formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from '@/types';

// Tally Silver Gateway — four sections: MASTERS / TRANSACTIONS / UTILITIES / REPORTS
const SECTIONS: { title: string; items: { key: string; label: string; path: string }[] }[] = [
  {
    title: 'MASTERS',
    items: [
      { key: 'L', label: 'Ledger', path: '/create/ledger' },
      { key: 'G', label: 'Groups', path: '/create/group' },
      { key: 'I', label: 'Inventory Items', path: '/create/stock-item' },
      { key: 'E', label: 'Employees', path: '/create/employee' },
      { key: 'A', label: 'Alter Master', path: '/alter/ledger' },
    ],
  },
  {
    title: 'TRANSACTIONS',
    items: [
      { key: 'V', label: 'Vouchers', path: '/vouchers/payment' },
      { key: 'S', label: 'Smart Entry (AI)', path: '/ai/smart-entry' },
      { key: 'N', label: 'Invoices', path: '/invoices' },
      { key: 'B', label: 'Banking', path: '/banking' },
    ],
  },
  {
    title: 'UTILITIES',
    items: [
      { key: 'X', label: 'Export to CA', path: '/utilities/share-with-ca' },
      { key: 'K', label: 'Ask Accura (AI)', path: '/ai/ask' },
      { key: 'Z', label: 'Anomaly Scanner', path: '/display/anomaly-scanner' },
      { key: 'F', label: 'F11: Features', path: '/company/features' },
      { key: 'C', label: 'F12: Configure', path: '/company/configure' },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { key: 'D', label: 'Day Book', path: '/display/day-book' },
      { key: 'T', label: 'Trial Balance', path: '/display/trial-balance' },
      { key: 'P', label: 'Profit & Loss A/c', path: '/display/profit-loss' },
      { key: 'W', label: 'Balance Sheet', path: '/display/balance-sheet' },
      { key: 'H', label: 'Stock Summary', path: '/display/stock-summary' },
      { key: 'R', label: 'GST Reports', path: '/display/gst/gstr1' },
      { key: 'O', label: 'Outstanding', path: '/display/outstanding/receivables' },
      { key: 'J', label: 'Ledger', path: '/display/ledger' },
      { key: 'U', label: 'Cash Book', path: '/display/cash-book' },
      { key: 'M', label: 'Bank Book', path: '/display/bank-book' },
      { key: 'Q', label: 'Sales Register', path: '/display/sales-register' },
      { key: 'Y', label: 'Purchase Register', path: '/display/purchase-register' },
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap(s => s.items);

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;
      const key = e.key.toUpperCase();
      const item = ALL_ITEMS.find(m => m.key === key);
      if (item) { e.preventDefault(); router.push(item.path); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, ALL_ITEMS.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); const item = ALL_ITEMS[selectedIdx]; if (item) router.push(item.path); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx]);

  return (
    <div className="gateway">
      {/* ── LEFT: Company info + Menu sections ── */}
      <div className="gateway-left">
        {/* Company info block */}
        <div style={{ border: '1px solid var(--tally-border)', marginBottom: 8 }}>
          <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-cyan)', padding: '2px 8px', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>
            ACCURA SILVER — Single User Edition
          </div>
          {[
            { label: 'Current Period', value: fy.label },
            { label: 'Current Date', value: formatDate(new Date(currentDate)) },
            { label: 'Company', value: activeCompany?.name ?? '— No Company —' },
            ...(activeCompany?.gstin ? [{ label: 'GSTIN', value: activeCompany.gstin }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', padding: '2px 8px', borderBottom: '1px solid var(--tally-border)', fontSize: 12 }}>
              <span style={{ color: 'var(--tally-text-dim)', minWidth: 110 }}>{label}</span>
              <span style={{ color: '#e8e8e8', fontFamily: 'Courier New', fontWeight: 'bold' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Menu sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {SECTIONS.map(section => (
            <div key={section.title} style={{ border: '1px solid var(--tally-border)' }}>
              <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-yellow)', padding: '2px 8px', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>
                {section.title}
              </div>
              {section.items.map(item => {
                const navIdx = ALL_ITEMS.indexOf(item);
                const isSelected = navIdx === selectedIdx;
                return (
                  <div
                    key={item.key}
                    className={`gateway-menu-item${isSelected ? ' selected' : ''}`}
                    onClick={() => router.push(item.path)}
                    onMouseEnter={() => setSelectedIdx(navIdx)}
                  >
                    <span className="key">{item.key}</span>
                    <span className="lbl" style={{ marginLeft: 8 }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Quick stats + recent vouchers + shortcuts ── */}
      <div className="gateway-right">
        <div style={{ background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', marginBottom: 8 }}>
          <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-cyan)', padding: '3px 8px', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>
            QUICK STATS
          </div>
          {[
            { label: 'Cash Balance', value: dashData?.cashBalance ?? 0, color: 'var(--tally-yellow)' },
            { label: 'Bank Balance', value: dashData?.bankBalance ?? 0, color: 'var(--tally-cyan)' },
            { label: 'Receivables', value: dashData?.topReceivables?.reduce((s, r) => s + r.amount, 0) ?? 0, color: 'var(--tally-green)' },
            { label: 'Payables', value: dashData?.topPayables?.reduce((s, p) => s + p.amount, 0) ?? 0, color: 'var(--tally-red)' },
            { label: 'GST Liability', value: dashData?.gstLiability ?? 0, color: 'var(--tally-text-dim)' },
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', borderBottom: '1px solid var(--tally-border)', fontSize: 12 }}>
              <span style={{ color: 'var(--tally-text-dim)' }}>{stat.label}</span>
              <span style={{ color: stat.color, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{formatCurrency(stat.value)}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', marginBottom: 8 }}>
          <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-cyan)', padding: '3px 8px', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>
            RECENT VOUCHERS
          </div>
          {(dashData?.recentVouchers ?? []).slice(0, 8).map(v => (
            <div key={v.id} style={{ padding: '2px 8px', borderBottom: '1px solid var(--tally-border)', fontSize: 11, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => router.push(`/vouchers/${v.type.toLowerCase()}`)}>
              <span style={{ color: 'var(--tally-cyan)' }}>{v.type.slice(0, 3)}</span>
              <span style={{ color: 'var(--tally-text-dim)' }}>{v.number}</span>
              <span style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(v.amount)}</span>
            </div>
          ))}
          {(!dashData?.recentVouchers || dashData.recentVouchers.length === 0) && (
            <div style={{ padding: '8px', color: 'var(--tally-text-dim)', fontSize: 11, textAlign: 'center' }}>No vouchers yet</div>
          )}
        </div>

        <div style={{ fontSize: 10, color: 'var(--tally-text-dim)', lineHeight: 1.9 }}>
          <div style={{ color: 'var(--tally-cyan)', marginBottom: 2, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>KEYBOARD</div>
          <div>⌘G / Alt+G : Go To</div>
          <div>F2 : Change Date</div>
          <div>F4 : Contra</div>
          <div>F5 : Payment</div>
          <div>F6 : Receipt</div>
          <div>F7 : Journal</div>
          <div>F8 : Sales</div>
          <div>F9 : Purchase</div>
          <div>⌘N : Calculator</div>
        </div>
      </div>
    </div>
  );
}
