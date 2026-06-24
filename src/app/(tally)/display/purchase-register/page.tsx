'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate, formatDateISO } from '@/lib/utils';
import type { Voucher } from '@/types';

export default function PurchaseRegisterPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery<{ vouchers: Voucher[] }>({
    queryKey: ['purchase-register', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return { vouchers: [] };
      const r = await fetch(`/api/reports/day-book?companyId=${activeCompany.id}&from=${from}&to=${to}&type=PURCHASE`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const vouchers = data?.vouchers ?? [];
  const total = vouchers.reduce((s, v) => s + Number(v.totalAmount), 0);

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">PURCHASE REGISTER</div>
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
      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill No.</th>
              <th>Supplier</th>
              <th>GSTIN</th>
              <th className="report-amount">Taxable</th>
              <th className="report-amount">Tax (ITC)</th>
              <th className="report-amount">Total</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id}>
                <td>{formatDate(v.date)}</td>
                <td style={{ color: '#FFD700' }}>{v.number}</td>
                <td>{v.partyName ?? '-'}</td>
                <td style={{ color: '#a0a0a0', fontSize: 10 }}>{v.partyGstin ?? '-'}</td>
                <td className="report-amount">{formatCurrency(Number(v.subtotal ?? v.totalAmount))}</td>
                <td className="report-amount" style={{ color: '#00FF7F' }}>{formatCurrency(Number(v.taxAmount ?? 0))}</td>
                <td className="report-amount">{formatCurrency(Number(v.totalAmount))}</td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No purchases for this period</td></tr>
            )}
          </tbody>
          {vouchers.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={6} style={{ textAlign: 'right' }}>TOTAL</td>
                <td className="report-amount">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}
