'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

interface LedgerRow {
  date: string;
  voucherNumber: string;
  voucherType: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
}

export default function CashBookPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery<{ rows: LedgerRow[]; openingBalance: number; closingBalance: number }>({
    queryKey: ['cash-book', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return { rows: [], openingBalance: 0, closingBalance: 0 };
      const r = await fetch(`/api/reports/ledger?companyId=${activeCompany.id}&ledgerName=Cash&from=${from}&to=${to}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">CASH BOOK</div>
        <div className="report-subtitle">{activeCompany?.name} | {from} to {to}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: '#a0a0a0' }}>From:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <span style={{ color: '#a0a0a0' }}>To:</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
      </div>
      <div style={{ display: 'flex', gap: 32, marginBottom: 8, fontSize: 12, padding: '4px 8px', background: '#16213e', border: '1px solid #2a2a4a' }}>
        <span style={{ color: '#a0a0a0' }}>Opening Balance: <span style={{ color: '#FFD700' }}>{formatCurrency(data?.openingBalance ?? 0)}</span></span>
        <span style={{ color: '#a0a0a0' }}>Closing Balance: <span style={{ color: '#00FF7F', fontWeight: 'bold' }}>{formatCurrency(data?.closingBalance ?? 0)}</span></span>
      </div>
      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher No.</th>
              <th>Type</th>
              <th>Particulars</th>
              <th className="report-amount">Receipts (Cr)</th>
              <th className="report-amount">Payments (Dr)</th>
              <th className="report-amount">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row, i) => (
              <tr key={i}>
                <td>{formatDate(row.date)}</td>
                <td style={{ color: '#FFD700' }}>{row.voucherNumber}</td>
                <td style={{ color: '#00BFFF' }}>{row.voucherType}</td>
                <td>{row.particulars}</td>
                <td className="report-amount cr">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                <td className="report-amount">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                <td className="report-amount" style={{ color: row.balanceType === 'CREDIT' ? '#00FF7F' : '#e8e8e8' }}>
                  {formatCurrency(row.balance)} {row.balanceType === 'CREDIT' ? 'Cr' : 'Dr'}
                </td>
              </tr>
            ))}
            {(!data?.rows || data.rows.length === 0) && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No cash transactions</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
