'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';

const GOTO_ITEMS = [
  { label: 'Contra', path: '/vouchers/contra', category: 'Vouchers', key: 'F4' },
  { label: 'Payment', path: '/vouchers/payment', category: 'Vouchers', key: 'F5' },
  { label: 'Receipt', path: '/vouchers/receipt', category: 'Vouchers', key: 'F6' },
  { label: 'Journal', path: '/vouchers/journal', category: 'Vouchers', key: 'F7' },
  { label: 'Sales / Invoice', path: '/vouchers/sales', category: 'Vouchers', key: 'F8' },
  { label: 'Purchase', path: '/vouchers/purchase', category: 'Vouchers', key: 'F9' },
  { label: 'Debit Note', path: '/vouchers/debit-note', category: 'Vouchers', key: 'Alt+F5' },
  { label: 'Credit Note', path: '/vouchers/credit-note', category: 'Vouchers', key: 'Alt+F6' },
  { label: 'Day Book', path: '/display/day-book', category: 'Reports', key: 'K' },
  { label: 'Balance Sheet', path: '/display/balance-sheet', category: 'Reports', key: 'B' },
  { label: 'Profit & Loss', path: '/display/profit-loss', category: 'Reports', key: 'P' },
  { label: 'Trial Balance', path: '/display/trial-balance', category: 'Reports' },
  { label: 'Cash Book', path: '/display/cash-book', category: 'Reports' },
  { label: 'Bank Book', path: '/display/bank-book', category: 'Reports' },
  { label: 'Ledger Report', path: '/display/ledger', category: 'Reports' },
  { label: 'Stock Summary', path: '/display/stock-summary', category: 'Reports', key: 'S' },
  { label: 'Ratio Analysis', path: '/display/ratio-analysis', category: 'Reports', key: 'R' },
  { label: 'Sales Register', path: '/display/sales-register', category: 'Reports' },
  { label: 'Purchase Register', path: '/display/purchase-register', category: 'Reports' },
  { label: 'Outstanding Receivables', path: '/display/outstanding/receivables', category: 'Reports' },
  { label: 'Outstanding Payables', path: '/display/outstanding/payables', category: 'Reports' },
  { label: 'GSTR-1', path: '/display/gst/gstr1', category: 'GST' },
  { label: 'GSTR-3B', path: '/display/gst/gstr3b', category: 'GST' },
  { label: 'GSTR-2B Reconciliation', path: '/display/gst/gstr2b', category: 'GST' },
  { label: 'Create Ledger', path: '/create/ledger', category: 'Create' },
  { label: 'Create Group', path: '/create/group', category: 'Create' },
  { label: 'Create Stock Item', path: '/create/stock-item', category: 'Create' },
  { label: 'Create Employee', path: '/create/employee', category: 'Create' },
  { label: 'Create Godown', path: '/create/godown', category: 'Create' },
  { label: 'Create Cost Centre', path: '/create/cost-centre', category: 'Create' },
  { label: 'Alter Ledger', path: '/alter/ledger', category: 'Alter' },
  { label: 'Alter Stock Item', path: '/alter/stock-item', category: 'Alter' },
  { label: 'Company Features', path: '/company/features', category: 'Settings', key: 'F11' },
  { label: 'Company Configure', path: '/company/configure', category: 'Settings', key: 'F12' },
  { label: 'Dashboard', path: '/dashboard', category: 'Dashboard', key: 'D' },
  { label: 'AI Assistant', path: '/ai', category: 'Tools' },
  { label: 'Banking', path: '/banking', category: 'Banking' },
  { label: 'Bank Reconciliation', path: '/banking/reconciliation', category: 'Banking' },
  { label: 'CA Portal', path: '/ca-portal', category: 'Tools' },
  { label: 'Gateway', path: '/gateway', category: 'Dashboard' },
];

export default function GoToModal() {
  const router = useRouter();
  const { showGoTo, closeGoTo, goToQuery, setGoToQuery } = useTallyStore();
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showGoTo) {
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showGoTo]);

  if (!showGoTo) return null;

  const filtered = goToQuery.trim() === ''
    ? GOTO_ITEMS
    : GOTO_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(goToQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(goToQuery.toLowerCase()) ||
        (item.key && item.key.toLowerCase().includes(goToQuery.toLowerCase()))
      );

  function navigate(path: string) {
    closeGoTo();
    router.push(path);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { closeGoTo(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter' && filtered[activeIdx]) { navigate(filtered[activeIdx].path); return; }
  }

  // Group by category
  const categories: Record<string, typeof GOTO_ITEMS> = {};
  filtered.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  let globalIdx = 0;

  return (
    <div className="goto-overlay" onClick={closeGoTo}>
      <div className="goto-box" onClick={(e) => e.stopPropagation()}>
        <div className="goto-title">Go To  [Alt+G]  — Type to search any screen</div>
        <input
          ref={inputRef}
          className="goto-input"
          placeholder="Search screens, reports, vouchers..."
          value={goToQuery}
          onChange={(e) => { setGoToQuery(e.target.value); setActiveIdx(0); }}
          onKeyDown={handleKeyDown}
        />
        <div className="goto-results">
          {Object.entries(categories).map(([cat, items]) => (
            <div key={cat}>
              <div style={{ padding: '3px 12px', fontSize: 10, color: '#00BFFF', background: 'rgba(0,63,96,0.3)', borderBottom: '1px solid #2a2a4a', textTransform: 'uppercase', letterSpacing: 1 }}>
                {cat}
              </div>
              {items.map((item) => {
                const idx = globalIdx++;
                return (
                  <div
                    key={item.path}
                    className={`goto-result-item${idx === activeIdx ? ' active' : ''}`}
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span>{item.label}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {item.key && <span className="goto-result-key">{item.key}</span>}
                      <span className="goto-result-category">{item.path}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 16, color: '#a0a0a0', textAlign: 'center', fontSize: 12 }}>
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
