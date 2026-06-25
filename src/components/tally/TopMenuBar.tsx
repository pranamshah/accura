'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
}

interface Menu {
  title: string;
  items: MenuItem[];
}

export default function TopMenuBar() {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { toggleDateModal, activeCompany } = useTallyStore();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const menus: Menu[] = [
    {
      title: 'Company',
      items: [
        { label: 'Accura Hub', shortcut: 'F3', action: () => router.push('/gateway') },
        { label: 'Alter Company', shortcut: 'Ctrl+Alt+F3', action: () => router.push('/company/configure') },
        { divider: true, label: '' },
        { label: 'Backup', action: () => toast.info('Backup not implemented') },
        { label: 'Restore', action: () => toast.info('Restore not implemented') },
        { divider: true, label: '' },
        { label: 'Quit', shortcut: 'Ctrl+Q', action: () => router.push('/gateway') },
      ],
    },
    {
      title: 'Data',
      items: [
        { label: 'Day Book', shortcut: 'K', action: () => router.push('/display/day-book') },
        { label: 'Balance Sheet', shortcut: 'B', action: () => router.push('/display/balance-sheet') },
        { label: 'Profit & Loss', shortcut: 'P', action: () => router.push('/display/profit-loss') },
        { label: 'Trial Balance', action: () => router.push('/display/trial-balance') },
        { divider: true, label: '' },
        { label: 'Stock Summary', shortcut: 'S', action: () => router.push('/display/stock-summary') },
      ],
    },
    {
      title: 'Exchange',
      items: [
        { label: 'Import Vouchers', action: () => toast.info('Import not implemented') },
        { label: 'Export Vouchers', action: () => toast.info('Export not implemented') },
        { label: 'e-Invoice', action: () => router.push('/display/gst/einvoice') },
        { label: 'e-Way Bill', action: () => router.push('/display/gst/eway-bills') },
      ],
    },
    {
      title: 'Print',
      items: [
        { label: 'Print Voucher', shortcut: 'Ctrl+P', action: () => toast.info('Use Print on voucher page') },
        { label: 'Print Report', action: () => toast.info('Use Print on report page') },
      ],
    },
    {
      title: 'Import',
      items: [
        { label: 'Import from Excel', action: () => toast.info('Import not implemented') },
        { label: 'Import Bank Statement', action: () => router.push('/banking/reconciliation') },
      ],
    },
    {
      title: 'Export',
      items: [
        { label: 'Export to Excel', action: () => window.open('/api/export/excel', '_blank') },
        { label: 'Export to PDF', action: () => window.open('/api/export/pdf', '_blank') },
        { label: 'GSTR-1 JSON', action: () => router.push('/display/gst/gstr1') },
      ],
    },
    {
      title: 'E-mail',
      items: [
        { label: 'E-mail Voucher', action: () => toast.info('E-mail not configured') },
        { label: 'E-mail Report', action: () => toast.info('E-mail not configured') },
        { label: 'Share with CA', action: () => router.push('/ca-portal') },
      ],
    },
    {
      title: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', action: () => toast.info('Alt+G: Go To, Ctrl+N: Calculator, F2: Date, F3: Home, F4-F9: Vouchers') },
        { label: 'About Accura', action: () => toast.info('Accura v2.0 — Professional Accounting Software') },
        { label: 'Initialize Database', action: () => router.push('/api/init') },
      ],
    },
  ];

  return (
    <div className="tally-top-menu" ref={barRef}>
      {menus.map((menu) => (
        <div key={menu.title} style={{ position: 'relative' }}>
          <div
            className={`tally-top-menu-item${openMenu === menu.title ? ' active' : ''}`}
            onClick={() => setOpenMenu(openMenu === menu.title ? null : menu.title)}
          >
            {menu.title}
            <span style={{ marginLeft: 2, fontSize: 9, color: '#a0a0a0' }}>▾</span>
          </div>
          {openMenu === menu.title && (
            <div className="tally-dropdown">
              {menu.items.map((item, i) => (
                item.divider
                  ? <div key={i} className="tally-dropdown-divider" />
                  : (
                    <div
                      key={i}
                      className="tally-dropdown-item"
                      onClick={() => { setOpenMenu(null); item.action?.(); }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="key">{item.shortcut}</span>}
                    </div>
                  )
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Right side shortcuts */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 0 }}>
        <div
          className="tally-top-menu-item"
          onClick={toggleDateModal}
          style={{ borderLeft: '1px solid var(--tally-border)', borderRight: 'none' }}
        >
          <span style={{ color: 'var(--tally-yellow)', fontWeight: 'bold', fontSize: 11 }}>F2</span>
          <span style={{ marginLeft: 4, fontSize: 11 }}>:Date</span>
        </div>
        <div
          className="tally-top-menu-item"
          onClick={() => router.push('/gateway')}
          style={{ borderRight: 'none' }}
        >
          <span style={{ color: 'var(--tally-yellow)', fontWeight: 'bold', fontSize: 11 }}>F3</span>
          <span style={{ marginLeft: 4, fontSize: 11 }}>:{activeCompany?.name ?? 'Company'}</span>
        </div>
      </div>
    </div>
  );
}
