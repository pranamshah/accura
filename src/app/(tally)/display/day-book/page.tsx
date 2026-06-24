'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate, formatDateISO } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { Voucher } from '@/types';

export default function DayBookPage() {
  const router = useRouter();
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery<{ vouchers: Voucher[] }>({
    queryKey: ['day-book', activeCompany?.id, from, to, typeFilter],
    queryFn: async () => {
      if (!activeCompany) return { vouchers: [] };
      let url = `/api/reports/day-book?companyId=${activeCompany.id}&from=${from}&to=${to}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      const r = await fetch(url);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const vouchers = data?.vouchers ?? [];
  const total = vouchers.reduce((s, v) => s + Number(v.totalAmount), 0);

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">DAY BOOK</div>
        <div className="report-subtitle">{activeCompany?.name} | {from} to {to}</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: '#a0a0a0' }}>From:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <span style={{ color: '#a0a0a0' }}>To:</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ background: '#0d1117', border: '1px solid #2a2a4a', color: '#e8e8e8', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11 }}>
          <option value="">All Types</option>
          {['SALES','PURCHASE','PAYMENT','RECEIPT','JOURNAL','CONTRA','DEBIT_NOTE','CREDIT_NOTE'].map((t) => (
            <option key={t} value={t} style={{ background: '#0d1117' }}>{t}</option>
          ))}
        </select>
        <button className="tally-btn" onClick={() => window.print()} style={{ fontSize: 11 }}>Print</button>
      </div>

      {isLoading ? (
        <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher No.</th>
              <th>Type</th>
              <th>Particulars</th>
              <th>Ref.</th>
              <th className="report-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id} onClick={() => router.push(`/vouchers/${v.type.toLowerCase().replace('_', '-')}`)}>
                <td>{formatDate(v.date)}</td>
                <td style={{ color: '#FFD700' }}>{v.number}</td>
                <td style={{ color: '#00BFFF' }}>{v.type}</td>
                <td>{(v as Voucher & { partyName?: string }).partyName ?? v.narration ?? '-'}</td>
                <td style={{ color: '#a0a0a0' }}>{v.reference ?? '-'}</td>
                <td className="report-amount">{formatCurrency(Number(v.totalAmount))}</td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No vouchers found for this period</td></tr>
            )}
          </tbody>
          {vouchers.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL</td>
                <td className="report-amount">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}
