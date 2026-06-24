'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate, formatDateISO } from '@/lib/utils';
import { useState } from 'react';
import type { Ledger } from '@/types';

export default function LedgerReportPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));
  const [selectedLedger, setSelectedLedger] = useState<string>('');

  const { data: ledgersData } = useQuery<{ ledgers: Ledger[] }>({
    queryKey: ['ledgers', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { ledgers: [] };
      const r = await fetch(`/api/ledger?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['ledger-report', activeCompany?.id, selectedLedger, from, to],
    queryFn: async () => {
      if (!activeCompany || !selectedLedger) return { rows: [], openingBalance: 0, closingBalance: 0 };
      const r = await fetch(`/api/reports/ledger?companyId=${activeCompany.id}&ledgerId=${selectedLedger}&from=${from}&to=${to}`);
      return r.json();
    },
    enabled: !!activeCompany && !!selectedLedger,
  });

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">LEDGER REPORT</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
      </div>

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
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <span style={{ color: '#a0a0a0' }}>To:</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
      </div>

      {selectedLedger && (
        <div style={{ display: 'flex', gap: 32, marginBottom: 8, fontSize: 12, padding: '4px 8px', background: '#16213e', border: '1px solid #2a2a4a' }}>
          <span style={{ color: '#a0a0a0' }}>Opening: <span style={{ color: '#FFD700' }}>{formatCurrency(data?.openingBalance ?? 0)}</span></span>
          <span style={{ color: '#a0a0a0' }}>Closing: <span style={{ color: '#00FF7F', fontWeight: 'bold' }}>{formatCurrency(data?.closingBalance ?? 0)}</span></span>
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
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row: { date: string; voucherNumber: string; voucherType: string; particulars: string; debit: number; credit: number; balance: number; balanceType: string }, i: number) => (
              <tr key={i}>
                <td>{formatDate(row.date)}</td>
                <td style={{ color: '#FFD700' }}>{row.voucherNumber}</td>
                <td style={{ color: '#00BFFF' }}>{row.voucherType}</td>
                <td>{row.particulars}</td>
                <td className="report-amount">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                <td className="report-amount cr">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                <td className="report-amount">{formatCurrency(row.balance)} {row.balanceType === 'CREDIT' ? 'Cr' : 'Dr'}</td>
              </tr>
            ))}
            {(!data?.rows || data.rows.length === 0) && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No transactions for this period</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
