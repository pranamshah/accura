'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { formatDate, getFinancialYear, formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from '@/types';

const MENU_ITEMS = [
  { key: 'D', label: 'Dashboard', path: '/dashboard', dots: '...' },
  { key: 'V', label: 'Vouchers', path: '/vouchers/payment', dots: '...' },
  { key: 'C', label: 'Create', path: '/create/ledger', dots: '...' },
  { key: 'A', label: 'Alter', path: '/alter/ledger', dots: '...' },
  { key: '', label: '', separator: true, path: '', dots: '' },
  { key: 'K', label: 'Day Book', path: '/display/day-book', dots: '...', shortcut: 'K' },
  { key: 'B', label: 'Balance Sheet', path: '/display/balance-sheet', dots: '...', shortcut: 'B' },
  { key: 'P', label: 'Profit & Loss A/c', path: '/display/profit-loss', dots: '...', shortcut: 'P' },
  { key: 'S', label: 'Stock Summary', path: '/display/stock-summary', dots: '...', shortcut: 'S' },
  { key: 'R', label: 'Ratio Analysis', path: '/display/ratio-analysis', dots: '...', shortcut: 'R' },
  { key: '', label: '', separator: true, path: '', dots: '' },
  { key: 'G', label: 'GST Reports', path: '/display/gst/gstr1', dots: '...' },
  { key: 'E', label: 'Employees', path: '/create/employee', dots: '...' },
  { key: '', label: '', separator: true, path: '', dots: '' },
  { key: 'Q', label: 'Quit / Logout', path: '__logout', dots: '...' },
];

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

  const navigableItems = MENU_ITEMS.filter((m) => !m.separator);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['input','textarea','select'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;
      const key = e.key.toUpperCase();
      const item = MENU_ITEMS.find((m) => m.key === key && !m.separator);
      if (item) {
        e.preventDefault();
        navigate(item);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, navigableItems.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const nav = navigableItems[selectedIdx];
        if (nav) navigate(nav);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx]);

  async function navigate(item: typeof MENU_ITEMS[0]) {
    if (item.path === '__logout') {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      return;
    }
    router.push(item.path);
  }

  return (
    <div className="gateway">
      {/* Left: Company Info + Menu */}
      <div className="gateway-left">
        <div className="gateway-company-info">
          <div>Current Company: <span className="value">{activeCompany?.name ?? 'No company selected'}</span></div>
          <div>Current Date: <span className="value">{formatDate(new Date(currentDate))}</span></div>
          <div>Financial Year: <span className="value">{fy.label}</span></div>
          {activeCompany?.gstin && <div>GSTIN: <span className="value">{activeCompany.gstin}</span></div>}
        </div>

        <div className="gateway-menu">
          <div className="gateway-menu-title">GATEWAY OF TALLY</div>
          {MENU_ITEMS.map((item, i) => {
            if (item.separator) return <div key={i} className="gateway-menu-separator" />;
            const navIdx = navigableItems.indexOf(item);
            return (
              <div
                key={i}
                className={`gateway-menu-item${navIdx === selectedIdx ? ' selected' : ''}`}
                onClick={() => navigate(item)}
                onMouseEnter={() => setSelectedIdx(navIdx)}
              >
                <span className="key">{item.key}</span>
                <span className="lbl" style={{ marginLeft: 8 }}>{item.label}</span>
                <span className="dots">{item.dots}</span>
                {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Quick Stats */}
      <div className="gateway-right">
        <div style={{ background: '#16213e', border: '1px solid #2a2a4a', marginBottom: 12 }}>
          <div style={{ background: '#0f3460', color: '#00BFFF', padding: '3px 8px', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
            QUICK STATS
          </div>
          {[
            { label: 'Cash Balance', value: dashData?.cashBalance ?? 0, color: '#00FF7F' },
            { label: 'Bank Balance', value: dashData?.bankBalance ?? 0, color: '#00BFFF' },
            { label: 'Receivables', value: dashData?.topReceivables?.reduce((s, r) => s + r.amount, 0) ?? 0, color: '#FFD700' },
            { label: 'Payables', value: dashData?.topPayables?.reduce((s, p) => s + p.amount, 0) ?? 0, color: '#FF4444' },
            { label: 'GST Liability', value: dashData?.gstLiability ?? 0, color: '#a0a0a0' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', borderBottom: '1px solid #2a2a4a', fontSize: 12 }}>
              <span style={{ color: '#a0a0a0' }}>{stat.label}</span>
              <span style={{ color: stat.color, fontFamily: "'Courier New', monospace" }}>{formatCurrency(stat.value)}</span>
            </div>
          ))}
        </div>

        {/* Recent Vouchers */}
        <div style={{ background: '#16213e', border: '1px solid #2a2a4a' }}>
          <div style={{ background: '#0f3460', color: '#00BFFF', padding: '3px 8px', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 }}>
            RECENT VOUCHERS
          </div>
          {(dashData?.recentVouchers ?? []).slice(0, 8).map((v) => (
            <div
              key={v.id}
              style={{ padding: '2px 8px', borderBottom: '1px solid #2a2a4a', fontSize: 11, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => router.push(`/vouchers/${v.type.toLowerCase()}`)}
            >
              <span style={{ color: '#00BFFF' }}>{v.type.slice(0, 3)}</span>
              <span style={{ color: '#a0a0a0' }}>{v.number}</span>
              <span style={{ color: '#FFD700', fontFamily: "'Courier New', monospace" }}>{formatCurrency(v.amount)}</span>
            </div>
          ))}
          {(!dashData?.recentVouchers || dashData.recentVouchers.length === 0) && (
            <div style={{ padding: '8px', color: '#a0a0a0', fontSize: 11, textAlign: 'center' }}>
              No vouchers yet
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        <div style={{ marginTop: 12, fontSize: 10, color: '#a0a0a0', lineHeight: 1.8 }}>
          <div style={{ color: '#00BFFF', marginBottom: 4 }}>KEYBOARD SHORTCUTS</div>
          <div>Alt+G : Go To any screen</div>
          <div>F2 : Change Date</div>
          <div>F4-F9 : Voucher types</div>
          <div>Ctrl+N : Calculator</div>
        </div>
      </div>
    </div>
  );
}
