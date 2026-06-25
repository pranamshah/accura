'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate, formatDateISO } from '@/lib/utils';
import { clickToChatReminder } from '@/lib/whatsapp';
import { toast } from 'sonner';
import { useState } from 'react';

interface OutstandingRow {
  ledgerId: string;
  ledgerName: string;
  totalDue: number;
  bills: Array<{ billRef: string; billDate: string; amount: number; ageDays: number }>;
}

export default function ReceivablesPage() {
  const { activeCompany, toDate } = useTallyStore();
  const [asOf, setAsOf] = useState(formatDateISO(new Date(toDate)));

  function sendReminder(row: OutstandingRow) {
    const mobile = (row as OutstandingRow & { mobileNo?: string }).mobileNo || '';
    if (!mobile) { toast.error(`No mobile number for ${row.ledgerName}. Update ledger master.`); return; }
    const bill = row.bills[0];
    const url = clickToChatReminder({
      partyName: row.ledgerName,
      partyMobile: mobile,
      invoiceNo: bill?.billRef || '-',
      amount: row.totalDue,
      date: bill?.billDate || asOf,
      overdueDays: bill?.ageDays || 0,
      companyName: activeCompany?.name || '',
    });
    window.open(url, '_blank');
  }

  const { data, isLoading } = useQuery<{ rows: OutstandingRow[]; total: number }>({
    queryKey: ['outstanding-receivables', activeCompany?.id, asOf],
    queryFn: async () => {
      if (!activeCompany) return { rows: [], total: 0 };
      const r = await fetch(`/api/reports/outstanding?companyId=${activeCompany.id}&type=receivable&asOf=${asOf}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">OUTSTANDING RECEIVABLES</div>
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
              <th>Party Name</th>
              <th>Bill Ref.</th>
              <th>Bill Date</th>
              <th className="report-amount">Age (Days)</th>
              <th className="report-amount">Amount Due</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row) => (
              <>
                <tr key={row.ledgerId} className="group-row">
                  <td colSpan={4}>{row.ledgerName}</td>
                  <td className="report-amount" style={{ color: '#00FF7F' }}>{formatCurrency(row.totalDue)}</td>
                  <td>
                    <button className="tally-btn" style={{ fontSize: 10, padding: '2px 6px', color: '#25D366' }}
                      onClick={() => sendReminder(row)}>WA Reminder</button>
                  </td>
                </tr>
                {row.bills.map((b, bi) => (
                  <tr key={bi}>
                    <td style={{ paddingLeft: 24, color: '#a0a0a0' }}></td>
                    <td style={{ color: '#FFD700' }}>{b.billRef || '-'}</td>
                    <td>{b.billDate ? formatDate(b.billDate) : '-'}</td>
                    <td className="report-amount" style={{ color: b.ageDays > 90 ? '#FF4444' : b.ageDays > 30 ? '#FFD700' : '#00FF7F' }}>
                      {b.ageDays}
                    </td>
                    <td className="report-amount">{formatCurrency(b.amount)}</td>
                  </tr>
                ))}
              </>
            ))}
            {(data?.rows ?? []).length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No outstanding receivables</td></tr>
            )}
          </tbody>
          {(data?.rows ?? []).length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={4}>TOTAL RECEIVABLES</td>
                <td className="report-amount" style={{ color: '#00FF7F' }}>{formatCurrency(data?.total ?? 0)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}
