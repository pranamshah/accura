'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate, formatDateISO, getFinancialYear } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Ledger } from '@/types';

// Indian FY months in order (Apr–Mar)
const FY_MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
const MONTH_NUM: Record<string, number> = {
  Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12, Jan:1, Feb:2, Mar:3,
};

interface LedgerRow {
  voucherId: string;
  date: string;
  voucherNumber: string;
  voucherType: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
}

export default function LedgerReportPage() {
  const { activeCompany, currentDate } = useTallyStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fy = getFinancialYear(new Date(currentDate), activeCompany?.financialYearStart ?? 4);
  const fyStartYear = fy.start.getFullYear();

  const [from, setFrom] = useState(formatDateISO(fy.start));
  const [to, setTo] = useState(formatDateISO(fy.end));
  const [selectedLedger, setSelectedLedger] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close action menu on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenFor(null);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const { data: ledgersData } = useQuery<{ ledgers: Ledger[] }>({
    queryKey: ['ledgers', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { ledgers: [] };
      const r = await fetch(`/api/ledger?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ledger-report', activeCompany?.id, selectedLedger, from, to],
    queryFn: async () => {
      if (!activeCompany || !selectedLedger) return { rows: [], openingBalance: 0, closingBalance: 0 };
      const r = await fetch(`/api/reports/ledger?companyId=${activeCompany.id}&ledgerId=${selectedLedger}&from=${from}&to=${to}`);
      return r.json();
    },
    enabled: !!activeCompany && !!selectedLedger,
  });

  function selectMonth(label: string) {
    if (selectedMonth === label) {
      // Deselect — revert to full FY
      setSelectedMonth(null);
      setFrom(formatDateISO(fy.start));
      setTo(formatDateISO(fy.end));
      return;
    }
    setSelectedMonth(label);
    const m = MONTH_NUM[label];
    const y = m >= 4 ? fyStartYear : fyStartYear + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, '0');
    setFrom(`${y}-${mm}-01`);
    setTo(`${y}-${mm}-${lastDay}`);
  }

  async function handleDeleteVoucher(voucherId: string, voucherNumber: string) {
    if (!confirm(`Delete voucher ${voucherNumber}? This cannot be undone.`)) return;
    const res = await fetch(`/api/vouchers/${voucherId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(`Voucher ${voucherNumber} deleted`);
      queryClient.invalidateQueries({ queryKey: ['ledger-report'] });
      refetch();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Delete failed');
    }
    setMenuOpenFor(null);
  }

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">LEDGER REPORT</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center', fontSize: 11, flexWrap: 'wrap' }}>
        <span style={{ color: '#a0a0a0' }}>Ledger:</span>
        <select
          value={selectedLedger}
          onChange={(e) => setSelectedLedger(e.target.value)}
          style={{ background: '#0d1117', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 8px', fontFamily: 'Courier New', fontSize: 11, minWidth: 200 }}
        >
          <option value="">Select Ledger</option>
          {(ledgersData?.ledgers ?? []).map((l) => (
            <option key={l.id} value={l.id} style={{ background: '#0d1117' }}>{l.name}</option>
          ))}
        </select>
        <span style={{ color: '#a0a0a0' }}>From:</span>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setSelectedMonth(null); }}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <span style={{ color: '#a0a0a0' }}>To:</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setSelectedMonth(null); }}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
      </div>

      {/* Month tabs */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
        {FY_MONTHS.map(m => (
          <button
            key={m}
            onClick={() => selectMonth(m)}
            style={{
              background: selectedMonth === m ? 'var(--tally-yellow)' : '#16213e',
              color: selectedMonth === m ? '#000' : '#a0a0a0',
              border: '1px solid #2a2a4a',
              padding: '1px 8px',
              fontFamily: 'Courier New',
              fontSize: 10,
              cursor: 'pointer',
              fontWeight: selectedMonth === m ? 'bold' : 'normal',
            }}
          >
            {m}
          </button>
        ))}
        {selectedMonth && (
          <button
            onClick={() => { setSelectedMonth(null); setFrom(formatDateISO(fy.start)); setTo(formatDateISO(fy.end)); }}
            style={{ background: 'transparent', color: 'var(--tally-red)', border: 'none', fontSize: 10, cursor: 'pointer', padding: '1px 4px', fontFamily: 'Courier New' }}
          >
            ✕ All
          </button>
        )}
      </div>

      {selectedLedger && (
        <div style={{ display: 'flex', gap: 32, marginBottom: 8, fontSize: 12, padding: '4px 8px', background: '#16213e', border: '1px solid #2a2a4a' }}>
          <span style={{ color: '#a0a0a0' }}>Opening: <span style={{ color: '#FFD700' }}>{formatCurrency(data?.openingBalance ?? 0)}</span></span>
          <span style={{ color: '#a0a0a0' }}>Closing: <span style={{ color: '#00FF7F', fontWeight: 'bold' }}>{formatCurrency(data?.closingBalance ?? 0)} {data?.closingBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}</span></span>
        </div>
      )}

      {!selectedLedger ? (
        <div style={{ color: '#a0a0a0', padding: 20, textAlign: 'center' }}>Select a ledger to view transactions</div>
      ) : isLoading ? (
        <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher No.</th>
              <th>Type</th>
              <th>Particulars</th>
              <th className="report-amount">Debit</th>
              <th className="report-amount">Credit</th>
              <th className="report-amount">Balance</th>
              <th style={{ width: 28 }}></th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row: LedgerRow, i: number) => (
              <tr key={i} style={{ position: 'relative' }}>
                <td>{formatDate(row.date)}</td>
                <td style={{ color: '#FFD700' }}>{row.voucherNumber}</td>
                <td style={{ color: '#00BFFF' }}>{row.voucherType}</td>
                <td>{row.particulars}</td>
                <td className="report-amount">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                <td className="report-amount cr">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                <td className="report-amount">{formatCurrency(row.balance)} {row.balanceType === 'CREDIT' ? 'Cr' : 'Dr'}</td>
                <td style={{ position: 'relative', textAlign: 'center' }}>
                  <button
                    onClick={() => setMenuOpenFor(menuOpenFor === row.voucherId + i ? null : row.voucherId + i)}
                    style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                    title="Actions"
                  >
                    ⋮
                  </button>
                  {menuOpenFor === row.voucherId + i && (
                    <div ref={menuRef} style={{
                      position: 'absolute', right: 0, top: '100%', background: 'var(--tally-bg-panel)',
                      border: '1px solid var(--tally-border)', zIndex: 50, minWidth: 160, whiteSpace: 'nowrap',
                    }}>
                      {[
                        { label: 'Edit Voucher', action: () => { router.push(`/vouchers/${row.voucherType.toLowerCase().replace(/_/g, '-')}?id=${row.voucherId}`); setMenuOpenFor(null); } },
                        { label: 'View Voucher', action: () => { router.push(`/vouchers/${row.voucherType.toLowerCase().replace(/_/g, '-')}?id=${row.voucherId}`); setMenuOpenFor(null); } },
                        { label: 'Delete Voucher', action: () => handleDeleteVoucher(row.voucherId, row.voucherNumber), danger: true },
                      ].map(item => (
                        <div
                          key={item.label}
                          onClick={item.action}
                          style={{
                            padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'Courier New',
                            color: (item as { danger?: boolean }).danger ? 'var(--tally-red)' : '#e8e8e8',
                            borderBottom: '1px solid var(--tally-border)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1a2a4a')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {(!data?.rows || data.rows.length === 0) && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No transactions for this period</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
