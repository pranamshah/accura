'use client';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';

const DEFAULT_BUTTONS = [
  { key: 'F1', label: 'Help', section: null },
  { key: 'F2', label: 'Date', action: 'date' },
  { key: 'F3', label: 'Company', action: 'gateway' },
  { key: 'Alt+F3', label: 'Cmp Info', action: 'configure' },
  { key: 'Ctrl+F3', label: 'Shut Cmp', action: 'logout' },
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
  { key: '---', label: '', separator: true },
  { key: 'Alt+G', label: 'Go To', action: 'goto' },
  { key: 'Ctrl+N', label: 'Calculator', action: 'calc' },
];

export default function RightButtonBar() {
  const router = useRouter();
  const { rightBarButtons, toggleDateModal, toggleCalculator, openGoTo } = useTallyStore();

  const buttons = rightBarButtons.length > 0 ? rightBarButtons : DEFAULT_BUTTONS;

  function handleAction(action?: string) {
    if (!action || action === '---') return;
    if (action === 'date') { toggleDateModal(); return; }
    if (action === 'goto') { openGoTo(); return; }
    if (action === 'calc') { toggleCalculator(); return; }
    if (action === 'gateway') { router.push('/gateway'); return; }
    if (action === 'features') { router.push('/company/features'); return; }
    if (action === 'configure') { router.push('/company/configure'); return; }
    if (action === 'logout') {
      fetch('/api/auth/logout', { method: 'POST' }).then(() => router.replace('/login'));
      return;
    }
    if (action.startsWith('/')) { router.push(action); return; }
  }

  return (
    <div className="tally-right-bar">
      {buttons.map((btn, i) => {
        const b = btn as { key: string; label: string; separator?: boolean; section?: string | null; action?: string };
        if (b.separator) {
          return <div key={i} style={{ height: 1, background: '#2a2a4a', margin: '2px 0' }} />;
        }
        if (b.section) {
          return <div key={i} className="tally-right-section">{b.section}</div>;
        }
        return (
          <div
            key={i}
            className="tally-right-btn"
            onClick={() => handleAction(b.action)}
          >
            <span className="key">{b.key}</span>
            <span className="label">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
