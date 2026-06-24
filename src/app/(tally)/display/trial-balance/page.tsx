'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

interface TBRow {
  ledgerName: string;
  groupName: string;
  nature: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
}

export default function TrialBalancePage() {
  const { activeCompany, toDate } = useTallyStore();
  const [asOf, setAsOf] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery<{ rows: TBRow[]; totalDebit: number; totalCredit: number }>({
    queryKey: ['trial-balance', activeCompany?.id, asOf],
    queryFn: async () => {
      if (!activeCompany) return { rows: [], totalDebit: 0, totalCredit: 0 };
      const r = await fetch(`/api/reports/trial-balance?companyId=${activeCompany.id}&asOf=${asOf}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const rows = data?.rows ?? [];

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">TRIAL BALANCE</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: '#a0a0a0' }}>As of:</span>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        </div>
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Ledger</th>
              <th>Group</th>
              <th className="report-amount">Debit</th>
              <th className="report-amount">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.ledgerName}</td>
                <td style={{ color: '#a0a0a0' }}>{row.groupName}</td>
                <td className="report-amount">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                <td className="report-amount cr">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No data</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={2}>TOTAL</td>
                <td className="report-amount">{formatCurrency(data?.totalDebit ?? 0)}</td>
                <td className="report-amount cr">{formatCurrency(data?.totalCredit ?? 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}
