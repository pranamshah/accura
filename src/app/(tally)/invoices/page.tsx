'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { clickToChatInvoice } from '@/lib/whatsapp';

interface Invoice {
  id: string;
  number: string;
  type: 'SALES' | 'PURCHASE';
  date: string;
  total_amount: number;
  narration: string;
  reference: string;
  party_name: string;
  party_gstin: string;
  party_mobile: string;
}

function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  function h(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + h(n % 100) : '');
  }
  const crore = Math.floor(n / 10000000); const rem1 = n % 10000000;
  const lakh = Math.floor(rem1 / 100000); const rem2 = rem1 % 100000;
  const thou = Math.floor(rem2 / 1000); const rem3 = rem2 % 1000;
  const parts = [];
  if (crore) parts.push(h(crore) + ' Crore');
  if (lakh) parts.push(h(lakh) + ' Lakh');
  if (thou) parts.push(h(thou) + ' Thousand');
  if (rem3) parts.push(h(rem3));
  return parts.join(' ') + ' Rupees Only';
}

export default function InvoicesPage() {
  const { activeCompany } = useTallyStore();
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ['invoices', activeCompany?.id, typeFilter],
    queryFn: async () => {
      if (!activeCompany) return { invoices: [] };
      const r = await fetch(`/api/invoices?companyId=${activeCompany.id}&type=${typeFilter}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  async function downloadPDF(inv: Invoice) {
    setGenerating(true);
    try {
      const res = await fetch(`/api/invoice/${inv.id}/pdf`);
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'PDF error'); return; }

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const v = d.voucher;
      const lines = d.inventoryLines || [];
      const gst = d.gstLines || [];

      // Header
      doc.setFillColor(14, 26, 23);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(74, 222, 128);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(v.company_name || activeCompany?.name || 'Company', 14, 14);
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(v.company_address || '', 14, 20);
      if (v.company_gstin) doc.text(`GSTIN: ${v.company_gstin}`, 14, 25);

      doc.setTextColor(45, 212, 191);
      doc.setFontSize(14);
      doc.text('TAX INVOICE', 160, 14, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(`Invoice No: ${v.number}`, 160, 20, { align: 'right' });
      doc.text(`Date: ${v.date}`, 160, 25, { align: 'right' });

      // Party details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 14, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(v.party_name || '-', 14, 44);
      if (v.party_address) doc.text(v.party_address, 14, 49);
      if (v.party_gstin) doc.text(`GSTIN: ${v.party_gstin}`, 14, 54);

      // Items table
      let y = 65;
      const colWidths = [8, 70, 20, 18, 22, 14, 28];
      const headers = ['#', 'Description', 'HSN', 'Qty', 'Rate', 'Disc%', 'Amount'];
      doc.setFillColor(30, 90, 69);
      doc.rect(14, y - 4, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      let x = 14;
      headers.forEach((h, i) => { doc.text(h, x + 1, y); x += colWidths[i]; });
      y += 5;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      lines.forEach((line: Record<string, unknown>, i: number) => {
        if (i % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(14, y - 4, 182, 6, 'F'); }
        x = 14;
        const vals = [String(i + 1), String(line.item_name || line.item_id || '-'), String(line.item_hsn || ''), String(line.quantity || 0), String(line.rate || 0), String(line.discount || 0) + '%', `₹${Number(line.amount || 0).toFixed(2)}`];
        vals.forEach((v, vi) => { doc.text(v, x + 1, y); x += colWidths[vi]; });
        y += 6;
      });

      // GST summary
      y += 4;
      const subtotal = lines.reduce((s: number, l: Record<string, unknown>) => s + Number(l.amount || 0), 0);
      const totalGST = gst.reduce((s: number, g: Record<string, unknown>) => s + Number(g.total_tax || 0), 0);
      const grandTotal = subtotal + totalGST;

      doc.setFont('helvetica', 'bold');
      const totLines = [
        ['Taxable Amount:', `₹${subtotal.toFixed(2)}`],
        ...(gst[0]?.igst_amount ? [['IGST:', `₹${gst.reduce((s: number, g: Record<string, unknown>) => s + Number(g.igst_amount || 0), 0).toFixed(2)}`]] : []),
        ...(!gst[0]?.igst_amount && gst.length ? [
          ['CGST:', `₹${gst.reduce((s: number, g: Record<string, unknown>) => s + Number(g.cgst_amount || 0), 0).toFixed(2)}`],
          ['SGST:', `₹${gst.reduce((s: number, g: Record<string, unknown>) => s + Number(g.sgst_amount || 0), 0).toFixed(2)}`],
        ] : []),
        ['Grand Total:', `₹${grandTotal.toFixed(2)}`],
      ];
      totLines.forEach(([label, val]) => {
        doc.text(label, 155, y, { align: 'right' });
        doc.text(val, 196, y, { align: 'right' });
        y += 5;
      });

      // Amount in words
      y += 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`Amount in words: ${numberToWords(Math.round(grandTotal))}`, 14, y);

      // Footer
      y = 270;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Generated by Accura — Professional Accounting Software', 105, y, { align: 'center' });
      doc.text('Authorised Signatory', 196, y - 10, { align: 'right' });

      doc.save(`${v.number}.pdf`);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setGenerating(false);
    }
  }

  function handleWhatsApp(inv: Invoice) {
    if (!inv.party_mobile) { toast.error('No mobile number for this party. Update the ledger master.'); return; }
    const url = clickToChatInvoice({
      partyName: inv.party_name,
      partyMobile: inv.party_mobile,
      invoiceNo: inv.number,
      date: inv.date,
      total: inv.total_amount,
      companyName: activeCompany?.name || '',
    });
    window.open(url, '_blank');
  }

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">INVOICES</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
          {['ALL', 'SALES', 'PURCHASE'].map((t) => (
            <button key={t} className="tally-btn" style={{ fontSize: 11, color: typeFilter === t ? 'var(--tally-yellow)' : undefined }}
              onClick={() => setTypeFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      {isLoading ? <div style={{ padding: 12, color: 'var(--tally-text-dim)' }}>Loading...</div> : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Type</th>
              <th>Party</th>
              <th className="report-amount">Amount</th>
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.invoices ?? []).map((inv) => (
              <tr key={inv.id} className={selected?.id === inv.id ? 'selected' : ''}
                onClick={() => setSelected(inv === selected ? null : inv)}>
                <td style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{inv.number}</td>
                <td style={{ fontSize: 11 }}>{formatDate(new Date(inv.date))}</td>
                <td style={{ fontSize: 11, color: inv.type === 'SALES' ? 'var(--tally-green)' : 'var(--tally-cyan)' }}>{inv.type}</td>
                <td style={{ fontSize: 11 }}>{inv.party_name || '-'}</td>
                <td className="report-amount">{formatCurrency(inv.total_amount)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="tally-btn" style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => downloadPDF(inv)} disabled={generating}>PDF</button>
                    <button className="tally-btn" style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => window.print()}>Print</button>
                    <button className="tally-btn" style={{ fontSize: 10, padding: '2px 6px', color: '#25D366' }}
                      onClick={() => handleWhatsApp(inv)}>WA</button>
                  </div>
                </td>
              </tr>
            ))}
            {(data?.invoices ?? []).length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--tally-text-dim)', padding: 24 }}>
                No invoices found. Create a Sales or Purchase voucher first.
              </td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
