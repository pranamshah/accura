'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

export default function GSTR1Page() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery({
    queryKey: ['gstr1', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return { b2b: [], b2cl: [], totalTaxable: 0, totalTax: 0 };
      const r = await fetch(`/api/gst/gstr1?companyId=${activeCompany.id}&from=${from}&to=${to}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">GSTR-1 — OUTWARD SUPPLIES</div>
        <div className="report-subtitle">{activeCompany?.name} | GSTIN: {activeCompany?.gstin ?? 'Not Set'}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: '#a0a0a0' }}>From:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <span style={{ color: '#a0a0a0' }}>To:</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <button className="tally-btn" onClick={() => window.open(`/api/export/excel?type=gstr1&companyId=${activeCompany?.id}&from=${from}&to=${to}`, '_blank')} style={{ fontSize: 11 }}>
          Export JSON
        </button>
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {[
              { label: 'Total Taxable', value: data?.totalTaxable ?? 0, color: '#e8e8e8' },
              { label: 'Total Tax', value: data?.totalTax ?? 0, color: '#FFD700' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: '6px 12px', fontSize: 12 }}>
                <span style={{ color: '#a0a0a0' }}>{s.label}: </span>
                <span style={{ color: s.color, fontWeight: 'bold' }}>{formatCurrency(s.value)}</span>
              </div>
            ))}
          </div>

          {/* B2B */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#00BFFF', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', borderBottom: '1px solid #2a2a4a', fontSize: 12, marginBottom: 4 }}>
              4A — B2B SUPPLIES (Registered Buyers)
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>GSTIN</th>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Invoice Type</th>
                  <th className="report-amount">Taxable</th>
                  <th className="report-amount">IGST</th>
                  <th className="report-amount">CGST</th>
                  <th className="report-amount">SGST</th>
                </tr>
              </thead>
              <tbody>
                {(data?.b2b ?? []).map((row: { gstin: string; invoiceNo: string; date: string; invoiceType: string; taxable: number; igst: number; cgst: number; sgst: number }, i: number) => (
                  <tr key={i}>
                    <td style={{ color: '#FFD700', fontSize: 10 }}>{row.gstin}</td>
                    <td>{row.invoiceNo}</td>
                    <td>{row.date}</td>
                    <td style={{ color: '#00BFFF' }}>{row.invoiceType}</td>
                    <td className="report-amount">{formatCurrency(row.taxable)}</td>
                    <td className="report-amount" style={{ color: '#FFD700' }}>{formatCurrency(row.igst)}</td>
                    <td className="report-amount" style={{ color: '#FFD700' }}>{formatCurrency(row.cgst)}</td>
                    <td className="report-amount" style={{ color: '#FFD700' }}>{formatCurrency(row.sgst)}</td>
                  </tr>
                ))}
                {(!data?.b2b || data.b2b.length === 0) && (
                  <tr><td colSpan={8} style={{ color: '#a0a0a0', textAlign: 'center', padding: 12 }}>No B2B supplies</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* B2CL */}
          <div>
            <div style={{ color: '#00BFFF', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', borderBottom: '1px solid #2a2a4a', fontSize: 12, marginBottom: 4 }}>
              5A — B2CL SUPPLIES (Large Inter-State Consumer)
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Place of Supply</th>
                  <th className="report-amount">Taxable</th>
                  <th className="report-amount">IGST</th>
                </tr>
              </thead>
              <tbody>
                {(data?.b2cl ?? []).map((row: { invoiceNo: string; date: string; pos: string; taxable: number; igst: number }, i: number) => (
                  <tr key={i}>
                    <td>{row.invoiceNo}</td>
                    <td>{row.date}</td>
                    <td>{row.pos}</td>
                    <td className="report-amount">{formatCurrency(row.taxable)}</td>
                    <td className="report-amount" style={{ color: '#FFD700' }}>{formatCurrency(row.igst)}</td>
                  </tr>
                ))}
                {(!data?.b2cl || data.b2cl.length === 0) && (
                  <tr><td colSpan={5} style={{ color: '#a0a0a0', textAlign: 'center', padding: 12 }}>No B2CL supplies</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
