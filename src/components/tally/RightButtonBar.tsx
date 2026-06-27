'use client';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';

// Mac-native shortcuts shown in the right button bar
const DEFAULT_BUTTONS = [
  { key: 'F2', label: 'Date', action: 'date' },
  { key: 'F3', label: 'Company', action: 'gateway' },
  { key: '⌘⇧O', label: 'Select Co.', action: 'gateway' },
  { key: '⌘F3', label: 'Shut Co.', action: 'logout' },
  { key: '---', label: '', separator: true },
  { key: 'F11', label: 'Features', action: 'features' },
  { key: 'F12', label: 'Configure', action: 'configure' },
  { key: '---', label: '', separator: true },
  { key: 'F4', label: 'Contra', action: '/vouchers/contra' },
  { key: 'F5', label: 'Payment', action: '/vouchers/payment' },
  { key: 'F6', label: 'Receipt', action: '/vouchers/receipt' },
  { key: 'F7', label: 'Journal', action: '/vouchers/journal' },
  { key: 'F8', label: 'Sales', action: '/vouchers/sales' },
  { key: 'F9', label: 'Purchase', action: '/vouchers/purchase' },
  { key: '⌘⇧5', label: 'Debit Note', action: '/vouchers/debit-note' },
  { key: '⌘⇧6', label: 'Credit Note', action: '/vouchers/credit-note' },
  { key: '⌘⇧7', label: 'Stk Journal', action: '/vouchers/stock-journal' },
  { key: '⌘⇧8', label: 'Delivery Nt', action: '/vouchers/delivery-note' },
  { key: '⌘⇧9', label: 'Receipt Nt', action: '/vouchers/receipt-note' },
  { key: '⌘F8', label: 'Sales Ord', action: '/vouchers/sales-order' },
  { key: '⌘F9', label: 'Purchase Ord', action: '/vouchers/purchase-order' },
  { key: '---', label: '', separator: true },
  { key: '⌥G', label: 'Go To', action: 'goto' },
  { key: '⌘⇧C', label: 'Calculator', action: 'calc' },
  { key: '⌘F', label: 'SmartFind', action: 'goto' },
  { key: '⌥C', label: 'Create Mstr', action: null },
  { key: '⌘S', label: 'Accept', action: null },
];

export default function RightButtonBar() {
  const router = useRouter();
  const { rightBarButtons, toggleDateModal, toggleCalculator, openGoTo } = useTallyStore();

  const buttons = rightBarButtons.length > 0 ? rightBarButtons : DEFAULT_BUTTONS;

  function handleAction(action?: string | null) {
    if (!action || action === '---') return;
    if (action === 'date') { toggleDateModal(); return; }
    if (action === 'goto') { openGoTo(); return; }
    if (action === 'calc') { toggleCalculator(); return; }
    if (action === 'gateway') { router.push('/gateway'); return; }
    if (action === 'features') { router.push('/company/features'); return; }
    if (action === 'configure') { router.push('/company/configure'); return; }
    if (action === 'logout') { router.replace('/gateway'); return; }
    if (action.startsWith('/')) { router.push(action); return; }
  }

  return (
    <div className="tally-right-bar">
      {buttons.map((btn, i) => {
        const b = btn as { key: string; label: string; separator?: boolean; section?: string | null; action?: string | null };
        if (b.separator) {
          return <div key={i} style={{ height: 1, background: 'var(--tally-border)', margin: '2px 0' }} />;
        }
        if (b.section) {
          return <div key={i} className="tally-right-section">{b.section}</div>;
        }
        return (
          <div
            key={i}
            className="tally-right-btn"
            onClick={() => handleAction(b.action)}
            style={{ cursor: b.action ? 'pointer' : 'default' }}
          >
            <span className="key">{b.key}</span>
            <span className="label">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
