'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

export default function GSTR3BPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery({
    queryKey: ['gstr3b', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return null;
      const r = await fetch(`/api/gst/gstr3b?companyId=${activeCompany.id}&from=${from}&to=${to}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">GSTR-3B — MONTHLY RETURN SUMMARY</div>
        <div className="report-subtitle">{activeCompany?.name} | {from} to {to}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: '#a0a0a0' }}>From:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <span style={{ color: '#a0a0a0' }}>To:</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <div style={{ maxWidth: 700 }}>
          {/* 3.1 Outward */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#00BFFF', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', fontSize: 12, marginBottom: 4 }}>
              3.1 — DETAILS OF OUTWARD SUPPLIES
            </div>
            <table className="report-table">
              <thead>
                <tr><th>Nature</th><th className="report-amount">Taxable</th><th className="report-amount">IGST</th><th className="report-amount">CGST</th><th className="report-amount">SGST</th></tr>
              </thead>
              <tbody>
                {[
                  { nature: '(a) Outward taxable supplies', taxable: data?.outwardTaxable ?? 0, igst: data?.outwardIGST ?? 0, cgst: data?.outwardCGST ?? 0, sgst: data?.outwardSGST ?? 0 },
                  { nature: '(b) Outward taxable (Zero rated)', taxable: data?.zeroRatedTaxable ?? 0, igst: 0, cgst: 0, sgst: 0 },
                  { nature: '(e) Non-GST outward supplies', taxable: data?.nonGST ?? 0, igst: 0, cgst: 0, sgst: 0 },
                ].map((r) => (
                  <tr key={r.nature}>
                    <td>{r.nature}</td>
                    <td className="report-amount">{formatCurrency(r.taxable)}</td>
                    <td className="report-amount" style={{ color: '#FFD700' }}>{formatCurrency(r.igst)}</td>
                    <td className="report-amount" style={{ color: '#FFD700' }}>{formatCurrency(r.cgst)}</td>
                    <td className="report-amount" style={{ color: '#FFD700' }}>{formatCurrency(r.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4 ITC */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#00FF7F', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', fontSize: 12, marginBottom: 4 }}>
              4 — ELIGIBLE ITC
            </div>
            <table className="report-table">
              <thead>
                <tr><th>Type</th><th className="report-amount">IGST</th><th className="report-amount">CGST</th><th className="report-amount">SGST</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>(A) ITC Available — Imports</td>
                  <td className="report-amount cr">{formatCurrency(data?.itcIGST ?? 0)}</td>
                  <td className="report-amount cr">{formatCurrency(data?.itcCGST ?? 0)}</td>
                  <td className="report-amount cr">{formatCurrency(data?.itcSGST ?? 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Tax Liability */}
          <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 12 }}>
            <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>NET TAX LIABILITY</div>
            {[
              { label: 'Total Output Tax', value: (data?.outwardIGST ?? 0) + (data?.outwardCGST ?? 0) + (data?.outwardSGST ?? 0) },
              { label: 'Total ITC Available', value: (data?.itcIGST ?? 0) + (data?.itcCGST ?? 0) + (data?.itcSGST ?? 0) },
              { label: 'Net Tax Payable', value: ((data?.outwardIGST ?? 0) + (data?.outwardCGST ?? 0) + (data?.outwardSGST ?? 0)) - ((data?.itcIGST ?? 0) + (data?.itcCGST ?? 0) + (data?.itcSGST ?? 0)) },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(42,42,74,0.4)', fontSize: 12 }}>
                <span style={{ color: '#a0a0a0' }}>{item.label}</span>
                <span style={{ color: item.label.includes('Net') ? '#FF4444' : '#e8e8e8', fontFamily: 'Courier New', fontWeight: item.label.includes('Net') ? 'bold' : 'normal' }}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
