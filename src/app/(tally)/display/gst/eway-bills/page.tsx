'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function EWayBillsPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const toISO = (d: Date) => new Date(d).toISOString().split('T')[0];
  const [from, setFrom] = useState(toISO(fromDate));
  const [to, setTo] = useState(toISO(toDate));

  const { data, isLoading } = useQuery({
    queryKey: ['eway-bills', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return { vouchers: [] };
      // e-Way bills apply to goods movement > ₹50,000
      const r = await fetch(
        `/api/vouchers?companyId=${activeCompany.id}&type=SALES&from=${from}&to=${to}`
      );
      return r.json();
    },
    enabled: !!activeCompany,
    staleTime: 30000,
  });

  const vouchers: any[] = (data?.vouchers ?? []).filter((v: any) => parseFloat(v.totalAmount) >= 50000);

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <h2 style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
          e-WAY BILLS
        </h2>
        <div className="flex items-center gap-2 ml-auto">
          <label style={{ color: 'var(--tally-label)', fontSize: '12px' }}>From</label>
          <input type="date" className="tally-input" value={from} onChange={e => setFrom(e.target.value)} style={{ width: '130px' }} />
          <label style={{ color: 'var(--tally-label)', fontSize: '12px' }}>To</label>
          <input type="date" className="tally-input" value={to} onChange={e => setTo(e.target.value)} style={{ width: '130px' }} />
        </div>
      </div>

      <div className="tally-form" style={{ marginBottom: '12px', padding: '8px 12px', maxWidth: '750px' }}>
        <div style={{ color: 'var(--tally-label)', fontSize: '11px', marginBottom: '4px' }}>e-WAY BILL RULES</div>
        <div style={{ color: 'var(--tally-text)', fontSize: '11px' }}>
          e-Way Bill mandatory for inter-state goods movement &gt; ₹50,000 and
          intra-state movement in most states. Valid for 1 day per 200 km.
          Generate from NIC e-Way Bill portal (ewaybillgst.gov.in).
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--tally-cyan)', fontFamily: 'var(--font-mono)' }}>Loading...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button className="tally-btn" onClick={() => alert('e-Way Bill generation requires NIC portal credentials.\nExport JSON for bulk generation from ewaybillgst.gov.in')}>
              Generate e-Way Bill
            </button>
            <button className="tally-btn" onClick={() => alert('JSON export for NIC portal bulk upload')}>
              Export JSON
            </button>
          </div>

          <table className="report-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Date</th>
                <th>Party</th>
                <th style={{ textAlign: 'right' }}>Value (₹)</th>
                <th>Supply Type</th>
                <th>Transport Mode</th>
                <th>e-Way Bill No.</th>
                <th>Valid Till</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--tally-text)' }}>
                    No invoices &gt; ₹50,000 found in this period
                  </td>
                </tr>
              ) : vouchers.map((v: any) => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--tally-cyan)' }}>{v.number}</td>
                  <td>{formatDate(v.date)}</td>
                  <td>{v.partyName ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(parseFloat(v.totalAmount))}</td>
                  <td style={{ fontSize: '11px' }}>Outward Supply</td>
                  <td style={{ fontSize: '11px' }}>Road</td>
                  <td style={{ color: '#ff9800', fontSize: '11px' }}>Not Generated</td>
                  <td style={{ fontSize: '11px' }}>—</td>
                  <td>
                    <span style={{
                      background: 'rgba(255, 152, 0, 0.2)',
                      color: '#ff9800',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      fontSize: '10px',
                    }}>PENDING</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {vouchers.length > 0 && (
            <div style={{ marginTop: '8px', color: 'var(--tally-label)', fontSize: '11px' }}>
              Showing {vouchers.length} invoice(s) with value ≥ ₹50,000 requiring e-Way Bill
            </div>
          )}
        </>
      )}
    </div>
  );
}
