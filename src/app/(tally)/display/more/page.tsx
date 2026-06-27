'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const MORE_SECTIONS = [
  {
    title: 'ACCOUNTING BOOKS',
    items: [
      { key: 'A', label: 'Cash Book', path: '/display/cash-book' },
      { key: 'B', label: 'Bank Book(s)', path: '/display/bank-book' },
      { key: 'D', label: 'Day Book', path: '/display/day-book' },
      { key: 'L', label: 'Ledger', path: '/display/ledger' },
    ],
  },
  {
    title: 'FINANCIAL STATEMENTS',
    items: [
      { key: 'W', label: 'Balance Sheet', path: '/display/balance-sheet' },
      { key: 'P', label: 'Profit & Loss A/c', path: '/display/profit-loss' },
      { key: 'T', label: 'Trial Balance', path: '/display/trial-balance' },
      { key: 'R', label: 'Ratio Analysis', path: '/display/ratio-analysis' },
    ],
  },
  {
    title: 'OUTSTANDING REPORTS',
    items: [
      { key: 'E', label: 'Receivables (Age-wise)', path: '/display/outstanding/receivables' },
      { key: 'Y', label: 'Payables (Age-wise)', path: '/display/outstanding/payables' },
    ],
  },
  {
    title: 'INVENTORY REPORTS',
    items: [
      { key: 'S', label: 'Stock Summary', path: '/display/stock-summary' },
    ],
  },
  {
    title: 'STATUTORY REPORTS',
    items: [
      { key: 'G', label: 'GST — GSTR-1', path: '/display/gst/gstr1' },
      { key: 'H', label: 'GST — GSTR-3B', path: '/display/gst/gstr3b' },
      { key: 'I', label: 'GST — GSTR-2B Reconciliation', path: '/display/gst/gstr2b' },
    ],
  },
  {
    title: 'TRANSACTION REGISTERS',
    items: [
      { key: 'Q', label: 'Sales Register', path: '/display/sales-register' },
      { key: 'U', label: 'Purchase Register', path: '/display/purchase-register' },
      { key: 'J', label: 'Journal Register (Day Book filtered)', path: '/display/day-book' },
    ],
  },
  {
    title: 'PAYROLL REPORTS',
    items: [
      { key: 'X', label: 'Salary Slips', path: '/display/payroll/salary-slips' },
      { key: 'F', label: 'PF Report', path: '/display/payroll/pf' },
      { key: 'C', label: 'ESI Report', path: '/display/payroll/esi' },
    ],
  },
  {
    title: 'AI & ANALYTICS',
    items: [
      { key: 'Z', label: 'Anomaly Scanner', path: '/display/anomaly-scanner' },
    ],
  },
];

const ALL_ITEMS = MORE_SECTIONS.flatMap(s => s.items);

export default function DisplayMorePage() {
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);

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
      <div className="gateway-left" style={{ maxWidth: '100%' }}>
        <div style={{ border: '1px solid var(--tally-border)', marginBottom: 8 }}>
          <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-cyan)', padding: '2px 8px', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>
            DISPLAY MORE REPORTS
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {MORE_SECTIONS.map(section => (
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
    </div>
  );
}
