'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function EInvoicePage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const toISO = (d: Date) => new Date(d).toISOString().split('T')[0];
  const [from, setFrom] = useState(toISO(fromDate));
  const [to, setTo] = useState(toISO(toDate));
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['einvoice', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return { entries: [] };
      const r = await fetch(
        `/api/gst/gstr1?companyId=${activeCompany.id}&from=${from}&to=${to}`
      );
      return r.json();
    },
    enabled: !!activeCompany,
    staleTime: 30000,
  });

  const entries: any[] = data?.entries ?? data?.b2b ?? [];

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === entries.length) setSelected([]);
    else setSelected(entries.map((e: any) => e.id));
  };

  const handleGenerateIRN = async () => {
    if (selected.length === 0) { alert('Select at least one invoice'); return; }
    alert(`e-Invoice IRN generation requires IRP (Invoice Registration Portal) credentials.\n\nSelected ${selected.length} invoice(s) ready for IRN generation.\n\nIntegrate with NIC IRP API for actual IRN generation.`);
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <h2 style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
          e-INVOICE (IRN GENERATION)
        </h2>
        <div className="flex items-center gap-2 ml-auto">
          <label style={{ color: 'var(--tally-label)', fontSize: '12px' }}>From</label>
          <input type="date" className="tally-input" value={from} onChange={e => setFrom(e.target.value)} style={{ width: '130px' }} />
          <label style={{ color: 'var(--tally-label)', fontSize: '12px' }}>To</label>
          <input type="date" className="tally-input" value={to} onChange={e => setTo(e.target.value)} style={{ width: '130px' }} />
        </div>
      </div>

      <div className="tally-form" style={{ marginBottom: '12px', padding: '8px 12px', maxWidth: '700px' }}>
        <div style={{ color: 'var(--tally-label)', fontSize: '11px', marginBottom: '4px' }}>e-INVOICE APPLICABILITY</div>
        <div style={{ color: 'var(--tally-text)', fontSize: '11px' }}>
          Mandatory for businesses with annual turnover &gt; ₹5 Crore (from Aug 2023).
          IRN is generated from NIC IRP portal and linked to each B2B invoice.
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--tally-cyan)', fontFamily: 'var(--font-mono)' }}>Loading...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button className="tally-btn" onClick={handleGenerateIRN}>
              Generate IRN ({selected.length})
            </button>
            <button className="tally-btn" onClick={() => alert('JSON download for IRP portal coming soon')}>
              Download JSON
            </button>
          </div>
          <table className="report-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '32px' }}>
                  <input type="checkbox" checked={selected.length === entries.length && entries.length > 0}
                    onChange={toggleAll} style={{ accentColor: 'var(--tally-yellow)' }} />
                </th>
                <th>Invoice No.</th>
                <th>Date</th>
                <th>Party GSTIN</th>
                <th>Party Name</th>
                <th style={{ textAlign: 'right' }}>Taxable</th>
                <th style={{ textAlign: 'right' }}>Total GST</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>IRN Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--tally-text)' }}>No B2B invoices found</td></tr>
              ) : entries.map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(e.id)}
                      onChange={() => toggleSelect(e.id)} style={{ accentColor: 'var(--tally-yellow)' }} />
                  </td>
                  <td style={{ color: 'var(--tally-cyan)' }}>{e.number ?? e.invoiceNo}</td>
                  <td>{formatDate(e.date)}</td>
                  <td>{e.partyGstin ?? e.gstin ?? '—'}</td>
                  <td>{e.partyName ?? e.party}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(parseFloat(e.taxableValue ?? e.taxable ?? 0))}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(
                    parseFloat(e.igstAmount ?? e.igst ?? 0) +
                    parseFloat(e.cgstAmount ?? e.cgst ?? 0) +
                    parseFloat(e.sgstAmount ?? e.sgst ?? 0)
                  )}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(parseFloat(e.totalAmount ?? e.total ?? 0))}</td>
                  <td style={{ color: '#ff9800', fontSize: '11px' }}>PENDING</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
